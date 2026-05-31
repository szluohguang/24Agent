import type Database from 'better-sqlite3'
import type { TaskState, AgentState, TimelineEntry, ScheduledTask, PermissionLevel, ReviewRecord } from './types.js'
import { Logger } from './logger.js'

const logger = Logger.getInstance()

/**
 * Store — SQLite 数据持久化层。
 * 所有结构化数据（tasks / agents / timeline / reviews / schedules / config）的统一读写入口。
 * 每个方法对应一个表的 CRUD 操作。
 */
export class Store {
  private db: Database.Database

  constructor(database: Database.Database) {
    this.db = database
  }

  // ── Tasks ──

  insertTask(task: TaskState): void {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, description, status, dependsOn, sessionId, retryCount, maxRetries, error, permission, budget, priority, createdAt, updatedAt)
      VALUES (@id, @description, @status, @dependsOn, @sessionId, @retryCount, @maxRetries, @error, @permission, @budget, @priority, @createdAt, @updatedAt)
    `)
    stmt.run({
      ...task,
      dependsOn: JSON.stringify(task.dependsOn),
      sessionId: task.sessionId ?? null,
      error: task.error ?? null,
    })
  }

  updateTask(task: TaskState): void {
    const stmt = this.db.prepare(`
      UPDATE tasks SET status=@status, dependsOn=@dependsOn, sessionId=@sessionId,
        retryCount=@retryCount, error=@error, permission=@permission, budget=@budget, updatedAt=@updatedAt
      WHERE id=@id
    `)
    stmt.run({
      id: task.id,
      status: task.status,
      dependsOn: JSON.stringify(task.dependsOn),
      sessionId: task.sessionId ?? null,
      retryCount: task.retryCount,
      error: task.error ?? null,
      permission: task.permission,
      budget: task.budget,
      updatedAt: Date.now(),
    })
  }

  deleteTask(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }

  deleteAgent(sessionId: string): void {
    this.db.prepare('DELETE FROM agents WHERE sessionId = ?').run(sessionId)
  }

  getAllTasks(): TaskState[] {
    const rows = this.db.prepare('SELECT * FROM tasks').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToTask(r))
  }

  getTasksByStatus(status: string): TaskState[] {
    const rows = this.db.prepare('SELECT * FROM tasks WHERE status = ?').all(status) as Record<string, unknown>[]
    return rows.map((r) => this.rowToTask(r))
  }

  private rowToTask(row: Record<string, unknown>): TaskState {
    return {
      id: row.id as string,
      description: row.description as string,
      status: row.status as TaskState['status'],
      dependsOn: JSON.parse(row.dependsOn as string) as string[],
      sessionId: (row.sessionId as string) || undefined,
      retryCount: row.retryCount as number,
      maxRetries: row.maxRetries as number,
      error: (row.error as string) || undefined,
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
      priority: row.priority as number,
      permission: (row.permission as PermissionLevel) || 'safe',
      budget: (row.budget as number) || 0,
    }
  }

  // ── Agents ──

  insertAgent(agent: AgentState): void {
    if (!agent.sessionId) {
      logger.warn('store', 'Skipping agent insert with null sessionId', { taskId: agent.taskId })
      return
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (sessionId, taskId, status, startTime, model, provider, lastHeartbeat, watchdogTimeout, healthStatus)
      VALUES (@sessionId, @taskId, @status, @startTime, @model, @provider, @lastHeartbeat, @watchdogTimeout, @healthStatus)
    `)
    stmt.run({
      ...agent,
      model: agent.model ?? null,
      provider: agent.provider ?? null,
    })
  }

  updateAgent(agent: AgentState): void {
    const stmt = this.db.prepare(`
      UPDATE agents SET status=@status, lastHeartbeat=@lastHeartbeat, healthStatus=@healthStatus
      WHERE sessionId=@sessionId
    `)
    stmt.run({
      sessionId: agent.sessionId,
      status: agent.status,
      lastHeartbeat: agent.lastHeartbeat,
      healthStatus: agent.healthStatus,
    })
  }

  getAllAgents(): AgentState[] {
    const rows = this.db.prepare('SELECT * FROM agents WHERE sessionId IS NOT NULL').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToAgent(r))
  }

  deleteNullSessionAgents(): void {
    this.db.prepare('DELETE FROM agents WHERE sessionId IS NULL').run()
  }

  getAgentsByTaskId(taskId: string): AgentState[] {
    const rows = this.db.prepare('SELECT * FROM agents WHERE taskId = ?').all(taskId) as Record<string, unknown>[]
    return rows.map((r) => this.rowToAgent(r))
  }

  private rowToAgent(row: Record<string, unknown>): AgentState {
    return {
      sessionId: row.sessionId as string,
      taskId: row.taskId as string,
      status: row.status as AgentState['status'],
      stream: [],
      startTime: row.startTime as number,
      model: (row.model as string) || undefined,
      provider: (row.provider as string) || undefined,
      lastHeartbeat: row.lastHeartbeat as number,
      watchdogTimeout: row.watchdogTimeout as number,
      healthStatus: row.healthStatus as AgentState['healthStatus'],
    }
  }

  // ── Timeline ──

  insertTimelineEntry(entry: TimelineEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO timeline (id, time, source, sessionId, type, message)
      VALUES (@id, @time, @source, @sessionId, @type, @message)
    `)
    stmt.run({
      ...entry,
      sessionId: entry.sessionId ?? null,
    })
  }

  getAllTimelineEntries(): TimelineEntry[] {
    const rows = this.db.prepare('SELECT * FROM timeline ORDER BY time ASC').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToTimelineEntry(r))
  }

  private rowToTimelineEntry(row: Record<string, unknown>): TimelineEntry {
    return {
      id: row.id as string,
      time: row.time as number,
      source: row.source as TimelineEntry['source'],
      sessionId: (row.sessionId as string) || undefined,
      type: row.type as string,
      message: row.message as string,
    }
  }

  // ── Reviews ──

  insertReview(record: ReviewRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (id, taskId, action, feedback, reviewer, reviewedAt)
      VALUES (@id, @taskId, @action, @feedback, @reviewer, @reviewedAt)
    `)
    stmt.run({
      id: `${record.taskId}-${record.reviewedAt}-${record.action}`,
      taskId: record.taskId,
      action: record.action,
      feedback: record.feedback ?? null,
      reviewer: record.reviewer,
      reviewedAt: record.reviewedAt,
    })
  }

  getReviewsByTaskId(taskId: string): ReviewRecord[] {
    const rows = this.db.prepare('SELECT * FROM reviews WHERE taskId = ? ORDER BY reviewedAt ASC').all(taskId) as Record<string, unknown>[]
    return rows.map((r) => this.rowToReview(r))
  }

  private rowToReview(row: Record<string, unknown>): ReviewRecord {
    return {
      taskId: row.taskId as string,
      action: row.action as ReviewRecord['action'],
      feedback: (row.feedback as string) || undefined,
      reviewer: row.reviewer as ReviewRecord['reviewer'],
      reviewedAt: row.reviewedAt as number,
    }
  }

  // ── Config ──

  getConfig(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value
  }

  setConfig(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO config (key, value) VALUES (@key, @value)
      ON CONFLICT(key) DO UPDATE SET value=@value
    `).run({ key, value })
  }

  getAllConfig(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[]
    const config: Record<string, string> = {}
    for (const row of rows) config[row.key] = row.value
    return config
  }

  getProjectConfig(): { directory: string; goal: string; description: string } {
    return {
      directory: this.getConfig('project_directory') || '',
      goal: this.getConfig('project_goal') || '',
      description: this.getConfig('project_description') || '',
    }
  }

  setProjectConfig(config: { directory: string; goal: string; description: string }): void {
    this.setConfig('project_directory', config.directory)
    this.setConfig('project_goal', config.goal)
    this.setConfig('project_description', config.description)
  }

  // ── Scheduled Tasks ──

  insertSchedule(schedule: ScheduledTask): void {
    const stmt = this.db.prepare(`
      INSERT INTO schedules (id, description, cronExpr, permission, budget, maxRetries, enabled, lastTriggered)
      VALUES (@id, @description, @cronExpr, @permission, @budget, @maxRetries, @enabled, @lastTriggered)
    `)
    stmt.run({
      ...schedule,
      enabled: schedule.enabled ? 1 : 0,
    })
  }

  updateSchedule(schedule: ScheduledTask): void {
    const stmt = this.db.prepare(`
      UPDATE schedules SET description=@description, cronExpr=@cronExpr, permission=@permission,
        budget=@budget, maxRetries=@maxRetries, enabled=@enabled, lastTriggered=@lastTriggered
      WHERE id=@id
    `)
    stmt.run({
      ...schedule,
      enabled: schedule.enabled ? 1 : 0,
    })
  }

  getAllSchedules(): ScheduledTask[] {
    const rows = this.db.prepare('SELECT * FROM schedules').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToSchedule(r))
  }

  deleteSchedule(id: string): void {
    this.db.prepare('DELETE FROM schedules WHERE id = ?').run(id)
  }

  private rowToSchedule(row: Record<string, unknown>): ScheduledTask {
    return {
      id: row.id as string,
      description: row.description as string,
      cronExpr: row.cronExpr as string,
      permission: row.permission as PermissionLevel,
      budget: row.budget as number,
      maxRetries: row.maxRetries as number,
      enabled: (row.enabled as number) === 1,
      lastTriggered: row.lastTriggered as number,
    }
  }
}
