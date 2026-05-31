import * as cron from 'node-cron'
import type { TaskState, ScheduledTask } from './types.js'
import { Logger } from './logger.js'

const logger = Logger.getInstance()

export type TaskCreator = (description: string, dependsOn?: string[]) => Promise<string>
export type TaskDispatcher = (taskId: string) => Promise<void>

export interface SchedulerCallbacks {
  onTaskReady: (taskId: string) => void
  onScheduleTriggered: (description: string) => void
}

/**
 * Scheduler — 任务调度与 DAG 依赖解析。
 * 能力：
 * - DAG 任务依赖管理与循环检测
 * - 基于队列的调度，支持并行度控制
 * - cron 定时任务触发
 */
export class Scheduler {
  private tasks: Map<string, TaskState> = new Map()
  private queue: string[] = []
  private activeCount = 0
  private maxParallel: number
  private createTask: TaskCreator
  private dispatchTask: TaskDispatcher
  private callbacks: SchedulerCallbacks
  private cronJobs: Map<string, cron.ScheduledTask> = new Map()

  constructor(
    createTask: TaskCreator,
    dispatchTask: TaskDispatcher,
    callbacks: SchedulerCallbacks,
    maxParallel = 3,
  ) {
    this.createTask = createTask
    this.dispatchTask = dispatchTask
    this.callbacks = callbacks
    this.maxParallel = maxParallel
  }

  // ── DAG 依赖解析 ──

  validateDag(taskId: string, dependsOn: string[]): void {
    const visited = new Set<string>()
    const check = (id: string, path: Set<string>) => {
      if (path.has(id)) throw new Error(`Circular dependency detected: ${Array.from(path).join(' -> ')}`)
      if (visited.has(id)) return
      visited.add(id)
      path.add(id)
      const task = this.tasks.get(id)
      if (task) {
        for (const dep of task.dependsOn) check(dep, path)
      }
      path.delete(id)
    }

    visited.add(taskId)
    const path = new Set<string>()
    path.add(taskId)
    for (const dep of dependsOn) check(dep, path)
  }

  getNextReadyTask(): string | null {
    for (const taskId of this.queue) {
      const task = this.tasks.get(taskId)
      if (task && this.areDependenciesMet(task)) return taskId
    }
    return null
  }

  private areDependenciesMet(task: TaskState): boolean {
    return task.dependsOn.every((depId) => {
      const dep = this.tasks.get(depId)
      return dep && dep.status === 'completed'
    })
  }

  // ── 调度队列 ──

  enqueue(taskId: string): void {
    if (!this.queue.includes(taskId)) this.queue.push(taskId)
    this.tryDispatchNext()
  }

  dequeue(taskId: string): void {
    this.queue = this.queue.filter((id) => id !== taskId)
  }

  onTaskCompleted(taskId: string): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.dependsOn.includes(taskId) && task.status === 'pending') {
        if (this.areDependenciesMet(task)) {
          this.callbacks.onTaskReady(id)
        }
      }
    }
  }

  onSessionEnded(): void {
    this.activeCount = Math.max(0, this.activeCount - 1)
    this.tryDispatchNext()
  }

  setMaxParallel(count: number): void {
    this.maxParallel = count
  }

  registerTask(task: TaskState): void {
    this.tasks.set(task.id, task)
  }

  updateTaskStatus(taskId: string, status: TaskState['status']): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = status
      task.updatedAt = Date.now()
    }
  }

  getQueueLength(): number {
    return this.queue.length
  }

  getActiveCount(): number {
    return this.activeCount
  }

  private tryDispatchNext(): void {
    while (this.activeCount < this.maxParallel) {
      const nextId = this.getNextReadyTask()
      if (!nextId) break
      this.queue = this.queue.filter((id) => id !== nextId)
      this.activeCount++
      // dispatchTask 可能抛出异步错误，必须 catch 避免进程崩溃
      Promise.resolve(this.dispatchTask(nextId)).catch((err) => {
        logger.error('scheduler', 'dispatchTask failed', { taskId: nextId, error: err instanceof Error ? err.message : String(err) })
        this.activeCount = Math.max(0, this.activeCount - 1)
        const t = this.tasks.get(nextId)
        if (t) {
          t.status = 'pending'
          t.updatedAt = Date.now()
        }
        this.enqueue(nextId)
      })
    }
  }

  // ── Cron 调度 ──

  registerCronJob(schedule: ScheduledTask): void {
    if (this.cronJobs.has(schedule.id)) return
    if (!cron.validate(schedule.cronExpr)) throw new Error(`Invalid cron expression: ${schedule.cronExpr}`)

    const job = cron.schedule(schedule.cronExpr, async () => {
      if (!schedule.enabled) return
      schedule.lastTriggered = Date.now()
      this.callbacks.onScheduleTriggered(schedule.description)
    })

    this.cronJobs.set(schedule.id, job)
    if (!schedule.enabled) job.stop()
  }

  unregisterCronJob(id: string): void {
    const job = this.cronJobs.get(id)
    if (job) {
      job.stop()
      this.cronJobs.delete(id)
    }
  }

  setCronJobEnabled(id: string, enabled: boolean): void {
    const job = this.cronJobs.get(id)
    if (job) {
      if (enabled) job.start()
      else job.stop()
    }
  }

  startAllCronJobs(): void {
    for (const job of this.cronJobs.values()) job.start()
  }

  stopAllCronJobs(): void {
    for (const job of this.cronJobs.values()) job.stop()
  }
}
