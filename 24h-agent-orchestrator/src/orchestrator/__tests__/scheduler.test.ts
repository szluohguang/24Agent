import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Scheduler } from '../scheduler.js'
import type { TaskState, ScheduledTask } from '../types.js'

vi.mock('node-cron', () => ({
  validate: vi.fn(() => true),
  schedule: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}))

function makeTask(overrides: Partial<TaskState> = {}): TaskState {
  const now = Date.now()
  return {
    id: 't1',
    description: 'test task',
    status: 'pending',
    dependsOn: [],
    retryCount: 0,
    maxRetries: 3,
    createdAt: now,
    updatedAt: now,
    priority: 0,
    permission: 'trusted',
    budget: 100,
    ...overrides,
  }
}

function makeScheduler(maxParallel = 3) {
  return new Scheduler(
    vi.fn() as (description: string, dependsOn?: string[]) => Promise<string>,
    vi.fn() as (taskId: string) => Promise<void>,
    { onTaskReady: vi.fn(), onScheduleTriggered: vi.fn() },
    maxParallel,
  )
}

describe('Scheduler', () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = makeScheduler()
  })

  describe('DAG validation', () => {
    it('passes for valid dependencies', () => {
      scheduler.registerTask(makeTask({ id: 'a', dependsOn: ['b'] }))
      scheduler.registerTask(makeTask({ id: 'b', dependsOn: [] }))
      expect(() => scheduler.validateDag('a', ['b'])).not.toThrow()
    })

    it('throws on circular dependencies', () => {
      scheduler.registerTask(makeTask({ id: 'b', dependsOn: ['c'] }))
      scheduler.registerTask(makeTask({ id: 'c', dependsOn: ['b'] }))
      expect(() => scheduler.validateDag('a', ['b'])).toThrow(/Circular dependency/)
    })
  })

  describe('enqueue and dispatch', () => {
    it('dispatches tasks up to maxParallel limit', () => {
      const dispatchTask = vi.fn()
      const s = new Scheduler(vi.fn(), dispatchTask, {
        onTaskReady: vi.fn(),
        onScheduleTriggered: vi.fn(),
      })

      for (let i = 0; i < 5; i++) {
        s.registerTask(makeTask({ id: `t${i}`, dependsOn: [] }))
        s.enqueue(`t${i}`)
      }

      expect(dispatchTask).toHaveBeenCalledTimes(3)
      expect(s.getQueueLength()).toBe(2)
      expect(s.getActiveCount()).toBe(3)
    })

    it('does not dispatch tasks with unmet dependencies', () => {
      const dispatchTask = vi.fn()
      const s = new Scheduler(vi.fn(), dispatchTask, {
        onTaskReady: vi.fn(),
        onScheduleTriggered: vi.fn(),
      })

      s.registerTask(makeTask({ id: 'a', dependsOn: ['b'] }))
      s.enqueue('a')

      expect(dispatchTask).not.toHaveBeenCalled()
      expect(s.getQueueLength()).toBe(1)
    })
  })

  describe('onTaskCompleted', () => {
    it('triggers onTaskReady for dependent tasks whose deps are now met', () => {
      const onTaskReady = vi.fn()
      const s = new Scheduler(vi.fn(), vi.fn(), {
        onTaskReady,
        onScheduleTriggered: vi.fn(),
      })

      s.registerTask(makeTask({ id: 'a', status: 'completed', dependsOn: [] }))
      s.registerTask(makeTask({ id: 'b', dependsOn: ['a'] }))

      s.onTaskCompleted('a')

      expect(onTaskReady).toHaveBeenCalledWith('b')
    })
  })

  describe('onSessionEnded', () => {
    it('decrements active count and dispatches next queued task', () => {
      const dispatchTask = vi.fn()
      const s = new Scheduler(vi.fn(), dispatchTask, {
        onTaskReady: vi.fn(),
        onScheduleTriggered: vi.fn(),
      })

      for (let i = 0; i < 5; i++) {
        s.registerTask(makeTask({ id: `t${i}`, dependsOn: [] }))
        s.enqueue(`t${i}`)
      }

      expect(s.getActiveCount()).toBe(3)
      expect(s.getQueueLength()).toBe(2)

      s.onSessionEnded()

      expect(s.getActiveCount()).toBe(3)
      expect(s.getQueueLength()).toBe(1)
      expect(dispatchTask).toHaveBeenCalledTimes(4)
    })
  })

  describe('cron jobs', () => {
    it('registers a cron job', () => {
      const schedule: ScheduledTask = {
        id: 'cron1',
        description: 'daily cleanup',
        cronExpr: '0 0 * * *',
        permission: 'trusted',
        budget: 50,
        maxRetries: 1,
        enabled: true,
        lastTriggered: 0,
      }

      expect(() => scheduler.registerCronJob(schedule)).not.toThrow()
    })

    it('unregisters a cron job without throwing', () => {
      const schedule: ScheduledTask = {
        id: 'cron1',
        description: 'daily cleanup',
        cronExpr: '0 0 * * *',
        permission: 'trusted',
        budget: 50,
        maxRetries: 1,
        enabled: true,
        lastTriggered: 0,
      }
      scheduler.registerCronJob(schedule)
      expect(() => scheduler.unregisterCronJob('cron1')).not.toThrow()
    })

    it('unregistering a non-existent id does nothing', () => {
      expect(() => scheduler.unregisterCronJob('nonexistent')).not.toThrow()
    })
  })

  describe('setMaxParallel', () => {
    it('affects how many tasks are dispatched concurrently', () => {
      const dispatchTask = vi.fn()
      const s = new Scheduler(vi.fn(), dispatchTask, {
        onTaskReady: vi.fn(),
        onScheduleTriggered: vi.fn(),
      })

      s.setMaxParallel(1)

      for (let i = 0; i < 3; i++) {
        s.registerTask(makeTask({ id: `t${i}`, dependsOn: [] }))
        s.enqueue(`t${i}`)
      }

      expect(dispatchTask).toHaveBeenCalledTimes(1)
      expect(s.getActiveCount()).toBe(1)
      expect(s.getQueueLength()).toBe(2)
    })
  })
})
