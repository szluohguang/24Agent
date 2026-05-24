import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import type { TaskState, AgentState, TimelineEntry, PermissionLevel } from './types.js'
import { createSubAgentSession, sendTaskPrompt, abortSession } from './acp-manager.js'
import { evaluateTaskCompletion } from '../observer/evaluator.js'
import { subscribeGlobalEvents, type EventHandlers } from '../observer/event-stream.js'

/** 编排器状态变更时触发的回调，用于广播到 WebSocket 客户端 */
export interface OrchestratorCallbacks {
  onStateChange: () => void
  onTimeline: (entry: TimelineEntry) => void
  onStreamDelta: (sessionId: string, delta: string) => void
  onAgentStateChange: (sessionId: string, state: Partial<AgentState>) => void
}

/**
 * Orchestrator 核心类：
 * - 管理任务生命周期（add → dispatch → complete/fail）
 * - 订阅 SSE 事件驱动状态转换
 * - 自动重试、预算控制、并行度限制
 */
export class Orchestrator {
  private client: OpencodeClient
  private tasks: Map<string, TaskState> = new Map()
  private agents: Map<string, AgentState> = new Map()
  private timeline: TimelineEntry[] = []
  private permissionLevel: PermissionLevel = 'safe'
  private budgetLimit = 50
  private budgetSpent = 0
  private maxParallel = 3
  private abortSignal: AbortController | null = null
  private callbacks: OrchestratorCallbacks
  private eventHandlers: EventHandlers

  constructor(client: OpencodeClient, callbacks: OrchestratorCallbacks) {
    this.client = client
    this.callbacks = callbacks

    // 注册 SSE 事件处理器：流式输出推送 WebUI，idle/error 触发后续逻辑
    this.eventHandlers = {
      onTextDelta: (sessionId, delta) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.stream.push(delta)
          this.callbacks.onStreamDelta(sessionId, delta)
        }
      },
      onSessionIdle: (sessionId) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.status = 'idle'
          this.callbacks.onAgentStateChange(sessionId, { status: 'idle' })
          this.handleSessionComplete(sessionId)
        }
      },
      onSessionError: (sessionId, error) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.status = 'error'
          this.callbacks.onAgentStateChange(sessionId, { status: 'error' })
          this.handleSessionError(sessionId, error)
        }
      },
    }
  }

  async start() {
    this.abortSignal = new AbortController()
    subscribeGlobalEvents(this.client, this.eventHandlers, this.abortSignal.signal)
    this.addTimeline('system', 'system', 'start', 'Orchestrator started')
  }

  stop() {
    this.abortSignal?.abort()
    this.addTimeline('system', 'system', 'stop', 'Orchestrator stopped')
  }

  /** 获取当前完整状态，用于 WebUI 初始化和 REST API */
  getState() {
    return {
      tasks: Array.from(this.tasks.values()),
      agents: Array.from(this.agents.values()),
      timeline: this.timeline,
      budget: { spent: this.budgetSpent, limit: this.budgetLimit },
    }
  }

  setPermissionLevel(level: PermissionLevel) { this.permissionLevel = level }
  setBudgetLimit(limit: number) { this.budgetLimit = limit }
  setMaxParallel(count: number) { this.maxParallel = count }

  /** 创建新任务（不自动分发），返回 taskId */
  addTask(description: string, dependsOn: string[] = []) {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const task: TaskState = {
      id,
      description,
      status: 'pending',
      dependsOn,
      retryCount: 0,
      maxRetries: 10,
    }
    this.tasks.set(id, task)
    this.addTimeline('system', 'system', 'task-add', `Task added: ${description}`)
    this.callbacks.onStateChange()
    return id
  }

  /** 分发任务：创建 ACP 会话 → 发送 prompt → 开始监听 */
  async dispatchTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)

    if (this.budgetSpent >= this.budgetLimit) {
      this.addTimeline('system', 'system', 'budget-limit',
        `Budget limit reached: ${this.budgetSpent}/${this.budgetLimit}`)
      return
    }

    task.status = 'running'
    const sessionData = await createSubAgentSession(
      this.client,
      taskId,
      { providerID: 'anthropic', modelID: 'claude-sonnet-4-20250514' },
      this.permissionLevel,
    )

    const sessionId = sessionData.id
    task.sessionId = sessionId

    const agentState: AgentState = {
      sessionId,
      taskId,
      status: 'creating',
      stream: [],
      startTime: Date.now(),
    }
    this.agents.set(sessionId, agentState)

    this.callbacks.onStateChange()
    this.addTimeline('main', sessionId, 'dispatch', `Dispatching: ${task.description}`)

    // sub-agent prompt：极简，让子 Agent 自己去读 OpenSpec 文档获取上下文
    const promptText = `You are a code development sub-agent.

## Task
${task.description}

## Instructions
1. Read the OpenSpec documents to understand the design
2. Look at the existing code to understand the architecture
3. Implement the required changes
4. Run tests to verify
5. Update tasks.md to mark your task as complete
6. Return a summary of what was done`

    await sendTaskPrompt(this.client, sessionId, promptText)
    agentState.status = 'running'
    this.callbacks.onAgentStateChange(sessionId, { status: 'running' })
  }

  /** 子 Agent 空闲（任务完成）时评估结果 */
  private async handleSessionComplete(sessionId: string) {
    try {
      const agent = this.agents.get(sessionId)
      if (!agent) return

      const task = this.tasks.get(agent.taskId)
      if (!task) return

      const result = await evaluateTaskCompletion(this.client, sessionId)

      task.status = 'completed'
      this.budgetSpent += result.cost

      this.addTimeline('sub', sessionId, 'complete',
        `Task completed: ${task.description} (cost: $${result.cost.toFixed(4)})`)

      this.agents.delete(sessionId)
      this.callbacks.onStateChange()
    } catch (err) {
      this.addTimeline('system', sessionId, 'eval-error',
        `Evaluation error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** 子 Agent 出错时检查重试次数，超过上限则标记失败 */
  private async handleSessionError(sessionId: string, _error: unknown) {
    const agent = this.agents.get(sessionId)
    if (!agent) return

    const task = this.tasks.get(agent.taskId)
    if (!task) return

    task.retryCount++
    if (task.retryCount >= task.maxRetries) {
      task.status = 'failed'
      task.error = `Max retries (${task.maxRetries}) exceeded`
      this.addTimeline('system', sessionId, 'max-retries',
        `Task failed: ${task.description} - max retries exceeded`)
    } else {
      this.addTimeline('system', sessionId, 'retry',
        `Retrying task: ${task.description} (attempt ${task.retryCount}/${task.maxRetries})`)
      this.agents.delete(sessionId)
      await this.dispatchTask(task.id)
    }
    this.callbacks.onStateChange()
  }

  /** 人工中止任务：中止 ACP 会话并重置任务为 pending */
  async abortTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task || !task.sessionId) return
    await abortSession(this.client, task.sessionId)
    task.status = 'pending'
    this.agents.delete(task.sessionId)
    this.addTimeline('user', 'system', 'abort', `Aborted: ${task.description}`)
    this.callbacks.onStateChange()
  }

  /** 添加时间线事件，同时通过回调广播到 WebUI */
  private addTimeline(source: TimelineEntry['source'], sessionId: string, type: string, message: string) {
    const entry: TimelineEntry = {
      id: crypto.randomUUID(),
      time: Date.now(),
      source,
      sessionId: sessionId !== 'system' ? sessionId : undefined,
      type,
      message,
    }
    this.timeline.push(entry)
    this.callbacks.onTimeline(entry)
  }
}
