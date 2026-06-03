import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach } from 'vitest'
import { Store } from '../store.js'
import type { TaskState, AgentState, TimelineEntry, ScheduledTask, PermissionLevel } from '../types.js'

function createStore(): Store {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', dependsOn TEXT NOT NULL DEFAULT '[]', sessionId TEXT, retryCount INTEGER NOT NULL DEFAULT 0, maxRetries INTEGER NOT NULL DEFAULT 10, error TEXT, permission TEXT NOT NULL DEFAULT 'safe', budget REAL NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 0, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, cometPhase TEXT);
    CREATE TABLE IF NOT EXISTS agents (sessionId TEXT PRIMARY KEY, taskId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'creating', startTime INTEGER NOT NULL, model TEXT, provider TEXT, lastHeartbeat INTEGER NOT NULL, watchdogTimeout INTEGER NOT NULL DEFAULT 120000, healthStatus TEXT NOT NULL DEFAULT 'healthy');
    CREATE TABLE IF NOT EXISTS timeline (id TEXT PRIMARY KEY, time INTEGER NOT NULL, source TEXT NOT NULL, sessionId TEXT, type TEXT NOT NULL, message TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, description TEXT NOT NULL, cronExpr TEXT NOT NULL, permission TEXT NOT NULL DEFAULT 'safe', budget REAL NOT NULL DEFAULT 0, maxRetries INTEGER NOT NULL DEFAULT 10, enabled INTEGER NOT NULL DEFAULT 1, lastTriggered INTEGER NOT NULL DEFAULT 0);
  `)
  return new Store(db)
}

function makeTask(overrides: Partial<TaskState> = {}): TaskState {
  const now = Date.now()
  return {
    id: 'task-1',
    description: 'test task',
    status: 'pending',
    dependsOn: [],
    retryCount: 0,
    maxRetries: 10,
    createdAt: now,
    updatedAt: now,
    priority: 0,
    permission: 'safe' as PermissionLevel,
    budget: 0,
    ...overrides,
  }
}

function makeAgent(overrides: Partial<AgentState> = {}): AgentState {
  const now = Date.now()
  return {
    sessionId: 'agent-1',
    taskId: 'task-1',
    status: 'creating',
    stream: [],
    startTime: now,
    model: 'gpt-4',
    provider: 'openai',
    lastHeartbeat: now,
    watchdogTimeout: 120000,
    healthStatus: 'healthy',
    ...overrides,
  }
}

function makeTimelineEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: 'tl-1',
    time: Date.now(),
    source: 'system',
    type: 'info',
    message: 'test event',
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    id: 'sched-1',
    description: 'daily job',
    cronExpr: '0 0 * * *',
    permission: 'safe' as PermissionLevel,
    budget: 0,
    maxRetries: 10,
    enabled: true,
    lastTriggered: 0,
    ...overrides,
  }
}

describe('Store', () => {
  let store: Store

  beforeEach(() => {
    store = createStore()
  })

  describe('tasks', () => {
    it('inserts and retrieves all tasks', () => {
      store.insertTask(makeTask())
      const all = store.getAllTasks()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe('task-1')
      expect(all[0].description).toBe('test task')
    })

    it('updateTask changes status and updatedAt', () => {
      const task = makeTask()
      store.insertTask(task)
      store.updateTask(makeTask({ status: 'running', updatedAt: task.updatedAt }))
      const all = store.getAllTasks()
      expect(all[0].status).toBe('running')
      expect(all[0].updatedAt).toBeGreaterThanOrEqual(task.updatedAt)
    })

    it('getTasksByStatus filters correctly', () => {
      store.insertTask(makeTask({ id: 't1', status: 'pending' }))
      store.insertTask(makeTask({ id: 't2', status: 'completed' }))
      store.insertTask(makeTask({ id: 't3', status: 'pending' }))
      const pending = store.getTasksByStatus('pending')
      expect(pending).toHaveLength(2)
      expect(pending.map(t => t.id).sort()).toEqual(['t1', 't3'])
    })
  })

  describe('agents', () => {
    it('inserts and retrieves all agents', () => {
      store.insertAgent(makeAgent())
      const all = store.getAllAgents()
      expect(all).toHaveLength(1)
      expect(all[0].sessionId).toBe('agent-1')
    })

    it('updateAgent updates status and healthStatus', () => {
      store.insertAgent(makeAgent())
      store.updateAgent(makeAgent({ status: 'running', lastHeartbeat: Date.now(), healthStatus: 'healthy' }))
      const all = store.getAllAgents()
      expect(all[0].status).toBe('running')
    })

    it('getAgentsByTaskId filters correctly', () => {
      store.insertAgent(makeAgent({ sessionId: 'a1', taskId: 'task-1' }))
      store.insertAgent(makeAgent({ sessionId: 'a2', taskId: 'task-2' }))
      store.insertAgent(makeAgent({ sessionId: 'a3', taskId: 'task-1' }))
      const agents = store.getAgentsByTaskId('task-1')
      expect(agents).toHaveLength(2)
      expect(agents.map(a => a.sessionId).sort()).toEqual(['a1', 'a3'])
    })
  })

  describe('timeline', () => {
    it('inserts and retrieves entries in time order', () => {
      store.insertTimelineEntry(makeTimelineEntry({ id: 'tl-1', time: 100 }))
      store.insertTimelineEntry(makeTimelineEntry({ id: 'tl-2', time: 50 }))
      store.insertTimelineEntry(makeTimelineEntry({ id: 'tl-3', time: 200 }))
      const all = store.getAllTimelineEntries()
      expect(all).toHaveLength(3)
      expect(all[0].id).toBe('tl-2')
      expect(all[1].id).toBe('tl-1')
      expect(all[2].id).toBe('tl-3')
    })
  })

  describe('config', () => {
    it('setConfig and getConfig return stored value', () => {
      store.setConfig('key1', 'value1')
      expect(store.getConfig('key1')).toBe('value1')
    })

    it('getConfig returns undefined for missing key', () => {
      expect(store.getConfig('nonexistent')).toBeUndefined()
    })

    it('getAllConfig returns all key-value pairs', () => {
      store.setConfig('a', '1')
      store.setConfig('b', '2')
      expect(store.getAllConfig()).toEqual({ a: '1', b: '2' })
    })
  })

  describe('schedules', () => {
    it('inserts and retrieves all schedules', () => {
      store.insertSchedule(makeSchedule())
      const all = store.getAllSchedules()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe('sched-1')
    })

    it('updateSchedule modifies fields', () => {
      store.insertSchedule(makeSchedule())
      store.updateSchedule(makeSchedule({ description: 'nightly job', cronExpr: '0 0 * * 0', enabled: false }))
      const all = store.getAllSchedules()
      expect(all[0].description).toBe('nightly job')
      expect(all[0].cronExpr).toBe('0 0 * * 0')
      expect(all[0].enabled).toBe(false)
    })

    it('deleteSchedule removes the schedule', () => {
      store.insertSchedule(makeSchedule())
      store.deleteSchedule('sched-1')
      expect(store.getAllSchedules()).toHaveLength(0)
    })
  })
})
