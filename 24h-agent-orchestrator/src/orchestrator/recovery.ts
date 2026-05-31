import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import type { Store } from './store.js'
import type { EventHandlers } from '../observer/event-stream.js'
import type { TaskState } from './types.js'
import { Logger } from './logger.js'

const logger = Logger.getInstance()

export interface RecoveryCallbacks {
  onTaskRecovered: (taskId: string) => void
  onSseReconnected: () => void
}

/**
 * Recovery — 故障恢复。
 * 能力：
 * - SSE 事件流自动重连（指数退避）
 * - 挂起会话的中止与恢复
 * - 启动时恢复上次未完成任务（pending / running / failed）
 */
export class Recovery {
  private store: Store
  private callbacks: RecoveryCallbacks
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private baseDelay = 1000
  private maxDelay = 60000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private client: OpencodeClient
  private eventHandlers: EventHandlers
  private abortSignal: AbortSignal | null = null

  constructor(
    client: OpencodeClient,
    eventHandlers: EventHandlers,
    store: Store,
    callbacks: RecoveryCallbacks,
    maxReconnectAttempts = Infinity,
  ) {
    this.client = client
    this.eventHandlers = eventHandlers
    this.store = store
    this.callbacks = callbacks
    this.maxReconnectAttempts = maxReconnectAttempts
  }

  setAbortSignal(signal: AbortSignal): void {
    this.abortSignal = signal
    if (signal.aborted) this.stop()
  }

  // ── SSE 自动重连 ──

  async attemptReconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return false

    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), this.maxDelay)
    this.reconnectAttempts++

    return new Promise((resolve) => {
      this.reconnectTimer = setTimeout(async () => {
        try {
          const { subscribeGlobalEvents } = await import('../observer/event-stream.js')
          if (this.abortSignal?.aborted) {
            resolve(false)
            return
          }
          await subscribeGlobalEvents(this.client, this.eventHandlers, this.abortSignal!)
          this.reconnectAttempts = 0
          logger.info('shutdown', `SSE reconnected after ${this.reconnectAttempts} attempts`)
          this.callbacks.onSseReconnected()
          resolve(true)
        } catch {
          resolve(await this.attemptReconnect())
        }
      }, delay)
    })
  }

  resetReconnect(): void {
    this.reconnectAttempts = 0
  }

  // ── 挂起会话恢复 ──

  async recoverHungSession(sessionId: string, taskId: string, retryCount: number, maxRetries: number): Promise<boolean> {
    if (retryCount >= maxRetries) return false

    try {
      const { abortSession } = await import('./acp-manager.js')
      await abortSession(this.client, sessionId)
    } catch {
      // stale session, ignore
    }

    return true
  }

  // ── 启动恢复 ──

  async recoverStartupTasks(dispatchTask: (taskId: string) => Promise<void>): Promise<void> {
    const pendingTasks = this.store.getTasksByStatus('pending')
    const runningTasks = this.store.getTasksByStatus('running')
    const failedTasks = this.store.getTasksByStatus('failed')

    for (const task of pendingTasks) {
      this.callbacks.onTaskRecovered(task.id)
    }

    for (const task of runningTasks) {
      const agents = this.store.getAgentsByTaskId(task.id)
      for (const agent of agents) {
        try {
          const { abortSession } = await import('./acp-manager.js')
          await abortSession(this.client, agent.sessionId)
        } catch {
          // ignore
        }
      }
      task.retryCount++
      task.status = 'running'
      this.store.updateTask(task)
      await dispatchTask(task.id)
    }

    for (const task of failedTasks) {
      if (task.retryCount < task.maxRetries) {
        task.retryCount++
        task.status = 'pending'
        task.error = undefined
        this.store.updateTask(task)
        this.callbacks.onTaskRecovered(task.id)
      }
    }
  }

  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
