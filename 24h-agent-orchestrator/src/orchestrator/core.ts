import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import type Database from 'better-sqlite3'
import type { TaskState, AgentState, TimelineEntry, PermissionLevel, ScheduledTask, HealthStatus } from './types.js'
import { createSubAgentSession, sendTaskPrompt, abortSession } from './acp-manager.js'
import { evaluateTaskCompletion } from '../observer/evaluator.js'
import { subscribeGlobalEvents, type EventHandlers } from '../observer/event-stream.js'
import { Store } from './store.js'
import { HealthMonitor } from './health-monitor.js'
import { Scheduler } from './scheduler.js'
import { Recovery } from './recovery.js'

/** 编排器状态变更时触发的回调，用于广播到 WebSocket 客户端 */
export interface OrchestratorCallbacks {
  onStateChange: () => void
  onTimeline: (entry: TimelineEntry) => void
  onStreamDelta: (sessionId: string, delta: string) => void
  onAgentStateChange: (sessionId: string, state: Partial<AgentState>) => void
}

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
  private store: Store
  private healthMonitor: HealthMonitor
  private scheduler: Scheduler
  private recovery: Recovery
  private db: Database.Database

  constructor(client: OpencodeClient, callbacks: OrchestratorCallbacks, database: Database.Database) {
    this.client = client
    this.callbacks = callbacks
    this.db = database
    this.store = new Store(database)

    // 从持久化加载配置
    this.loadConfig()

    // 健康监控
    this.healthMonitor = new HealthMonitor(
      {
        onSessionHung: (sessionId) => this.handleHungSession(sessionId),
        onSseStale: () => this.recovery.attemptReconnect(),
      },
      async (sessionId) => {
        try {
          const agent = this.agents.get(sessionId)
          return agent !== undefined && agent.status !== 'error'
        } catch {
          return false
        }
      },
    )

    // 调度器
    this.scheduler = new Scheduler(
      async (description, dependsOn) => this.addTask(description, dependsOn),
      async (taskId) => this.dispatchTask(taskId),
      {
        onTaskReady: (taskId) => this.scheduler.enqueue(taskId),
        onScheduleTriggered: (description) => {
          this.addTask(description)
        },
      },
      this.maxParallel,
    )

    // 恢复器
    this.recovery = new Recovery(
      client,
      this.createEventHandlers(),
      this.store,
      {
        onTaskRecovered: (taskId) => this.scheduler.enqueue(taskId),
        onSseReconnected: () => console.log('[recovery] SSE reconnected'),
      },
    )

    this.eventHandlers = this.createEventHandlers()
  }

  private createEventHandlers(): EventHandlers {
    return {
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
          agent.healthStatus = 'healthy'
          agent.lastHeartbeat = Date.now()
          this.store.updateAgent(agent)
          this.callbacks.onAgentStateChange(sessionId, { status: 'idle' })
          this.handleSessionComplete(sessionId)
        }
      },
      onSessionError: (sessionId, error) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.status = 'error'
          agent.healthStatus = 'dead'
          this.store.updateAgent(agent)
          this.callbacks.onAgentStateChange(sessionId, { status: 'error' })
          this.handleSessionError(sessionId, error)
        }
      },
      onTimeline: (entry) => {
        this.addTimeline(entry.source, entry.sessionId || '', entry.type, entry.message)
      },
      onAnyEvent: (sessionId) => {
        if (sessionId) this.healthMonitor.notifySessionEvent(sessionId)
        this.healthMonitor.onSseEvent()
      },
    }
  }

  private loadConfig() {
    const permission = this.store.getConfig('permissionLevel')
    if (permission) this.permissionLevel = permission as PermissionLevel

    const budget = this.store.getConfig('budgetLimit')
    if (budget) this.budgetLimit = parseFloat(budget)

    const parallel = this.store.getConfig('maxParallel')
    if (parallel) this.maxParallel = parseInt(parallel, 10)
  }

  async start() {
    this.abortSignal = new AbortController()
    this.recovery.setAbortSignal(this.abortSignal.signal)

    subscribeGlobalEvents(this.client, this.eventHandlers, this.abortSignal.signal)
    this.healthMonitor.start()

    // 启动时恢复未完成任务
    await this.recovery.recoverStartupTasks(async (taskId) => this.dispatchTask(taskId))

    this.addTimeline('system', 'system', 'start', 'Orchestrator started')
  }

  stop() {
    this.abortSignal?.abort()
    this.healthMonitor.stop()
    this.scheduler.stopAllCronJobs()
    this.recovery.stop()
    this.addTimeline('system', 'system', 'stop', 'Orchestrator stopped')
  }

  getState() {
    return {
      tasks: Array.from(this.tasks.values()),
      agents: Array.from(this.agents.values()),
      timeline: this.timeline,
      budget: { spent: this.budgetSpent, limit: this.budgetLimit },
    }
  }

  setPermissionLevel(level: PermissionLevel) {
    this.permissionLevel = level
    this.store.setConfig('permissionLevel', level)
  }

  setBudgetLimit(limit: number) {
    this.budgetLimit = limit
    this.store.setConfig('budgetLimit', String(limit))
  }

  setMaxParallel(count: number) {
    this.maxParallel = count
    this.scheduler.setMaxParallel(count)
    this.store.setConfig('maxParallel', String(count))
  }

  addTask(description: string, dependsOn: string[] = []) {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()

    // DAG 循环依赖检测
    this.scheduler.validateDag(id, dependsOn)

    const task: TaskState = {
      id, description, status: 'pending', dependsOn,
      retryCount: 0, maxRetries: 10, createdAt: now, updatedAt: now,
      priority: 0, permission: this.permissionLevel, budget: this.budgetLimit,
    }
    this.tasks.set(id, task)
    this.store.insertTask(task)
    this.scheduler.registerTask(task)
    this.scheduler.enqueue(id)
    this.addTimeline('system', 'system', 'task-add', `Task added: ${description}`)
    this.callbacks.onStateChange()
    return id
  }

  async dispatchTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)

    if (this.budgetSpent >= this.budgetLimit) {
      this.addTimeline('system', 'system', 'budget-limit',
        `Budget limit reached: ${this.budgetSpent}/${this.budgetLimit}`)
      return
    }

    task.status = 'running'
    task.updatedAt = Date.now()
    this.store.updateTask(task)

    const sessionData = await createSubAgentSession(
      this.client,
      taskId,
      { providerID: 'anthropic', modelID: 'claude-sonnet-4-20250514' },
      this.permissionLevel,
    )

    const sessionId = sessionData.id
    task.sessionId = sessionId

    const now = Date.now()
    const agentState: AgentState = {
      sessionId,
      taskId,
      status: 'creating',
      stream: [],
      startTime: now,
      lastHeartbeat: now,
      watchdogTimeout: 120000,
      healthStatus: 'healthy',
    }
    this.agents.set(sessionId, agentState)
    this.store.insertAgent(agentState)
    this.healthMonitor.registerSession(sessionId, agentState)

    this.callbacks.onStateChange()
    this.addTimeline('main', sessionId, 'dispatch', `Dispatching: ${task.description}`)

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
    this.store.updateAgent(agentState)
    this.callbacks.onAgentStateChange(sessionId, { status: 'running' })
  }

  private async handleSessionComplete(sessionId: string) {
    try {
      const agent = this.agents.get(sessionId)
      if (!agent) return

      const task = this.tasks.get(agent.taskId)
      if (!task) return

      const result = await evaluateTaskCompletion(this.client, sessionId)

      task.status = 'completed'
      task.updatedAt = Date.now()
      this.budgetSpent += result.cost

      this.store.updateTask(task)
      this.agents.delete(sessionId)
      this.healthMonitor.unregisterSession(sessionId)
      this.scheduler.updateTaskStatus(agent.taskId, 'completed')
      this.scheduler.onTaskCompleted(agent.taskId)
      this.scheduler.onSessionEnded()

      this.addTimeline('sub', sessionId, 'complete',
        `Task completed: ${task.description} (cost: $${result.cost.toFixed(4)})`)

      this.callbacks.onStateChange()
    } catch (err) {
      this.addTimeline('system', sessionId, 'eval-error',
        `Evaluation error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async handleSessionError(sessionId: string, _error: unknown) {
    const agent = this.agents.get(sessionId)
    if (!agent) return

    const task = this.tasks.get(agent.taskId)
    if (!task) return

    task.retryCount++
    task.updatedAt = Date.now()
    this.healthMonitor.unregisterSession(sessionId)

    if (task.retryCount >= task.maxRetries) {
      task.status = 'failed'
      task.error = `Max retries (${task.maxRetries}) exceeded`
      this.store.updateTask(task)
      this.scheduler.updateTaskStatus(agent.taskId, 'failed')
      this.scheduler.onSessionEnded()
      this.agents.delete(sessionId)

      this.addTimeline('system', sessionId, 'max-retries',
        `Task failed: ${task.description} - max retries exceeded`)
    } else {
      this.store.updateTask(task)
      this.agents.delete(sessionId)
      this.scheduler.onSessionEnded()

      this.addTimeline('system', sessionId, 'retry',
        `Retrying task: ${task.description} (attempt ${task.retryCount}/${task.maxRetries})`)
      await this.dispatchTask(task.id)
    }
    this.callbacks.onStateChange()
  }

  private async handleHungSession(sessionId: string) {
    const agent = this.agents.get(sessionId)
    if (!agent) return

    const task = this.tasks.get(agent.taskId)
    if (!task) return

    const shouldRecover = await this.recovery.recoverHungSession(
      sessionId, agent.taskId, task.retryCount, task.maxRetries,
    )

    if (shouldRecover) {
      task.retryCount++
      task.updatedAt = Date.now()
      this.store.updateTask(task)
      this.agents.delete(sessionId)
      this.healthMonitor.unregisterSession(sessionId)
      this.scheduler.onSessionEnded()

      this.addTimeline('system', sessionId, 'hung-recovery',
        `Session hung, retrying (${task.retryCount}/${task.maxRetries})`)
      await this.dispatchTask(task.id)
    } else {
      task.status = 'failed'
      task.error = 'Session hung, max retries exceeded'
      task.updatedAt = Date.now()
      this.store.updateTask(task)
      this.agents.delete(sessionId)
      this.healthMonitor.unregisterSession(sessionId)
      this.scheduler.onSessionEnded()

      this.addTimeline('system', sessionId, 'hung-failed',
        `Task failed: ${task.description} - session hung, max retries exceeded`)
    }
    this.callbacks.onStateChange()
  }

  async abortTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (task.sessionId) {
      try {
        await abortSession(this.client, task.sessionId)
      } catch {
        // stale session
      }
      this.agents.delete(task.sessionId)
      this.healthMonitor.unregisterSession(task.sessionId)
    }

    task.status = 'pending'
    task.sessionId = undefined
    task.updatedAt = Date.now()
    this.store.updateTask(task)

    this.scheduler.onSessionEnded()

    this.addTimeline('user', 'system', 'abort', `Aborted: ${task.description}`)
    this.callbacks.onStateChange()
  }

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
    this.store.insertTimelineEntry(entry)
    this.callbacks.onTimeline(entry)
  }

  // ── Schedule management ──

  addSchedule(description: string, cronExpr: string, permission: PermissionLevel = 'safe', budget = 0, maxRetries = 10): string {
    const id = `schedule-${Date.now()}`
    const schedule: ScheduledTask = {
      id, description, cronExpr, permission, budget, maxRetries, enabled: true, lastTriggered: 0,
    }
    this.store.insertSchedule(schedule)
    this.scheduler.registerCronJob(schedule)
    return id
  }

  getSchedules(): ScheduledTask[] {
    return this.store.getAllSchedules()
  }

  updateSchedule(id: string, updates: Partial<ScheduledTask>): void {
    const schedules = this.store.getAllSchedules()
    const existing = schedules.find((s) => s.id === id)
    if (!existing) throw new Error(`Schedule ${id} not found`)

    const updated = { ...existing, ...updates }
    this.store.updateSchedule(updated)
    this.scheduler.unregisterCronJob(id)
    if (updated.enabled) this.scheduler.registerCronJob(updated)
  }

  deleteSchedule(id: string): void {
    this.scheduler.unregisterCronJob(id)
    this.store.deleteSchedule(id)
  }
}
