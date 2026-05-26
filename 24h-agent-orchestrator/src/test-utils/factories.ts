import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { vi, type MockInstance } from 'vitest'
import { Orchestrator } from '../orchestrator/core.js'
import type { PermissionLevel, TimelineEntry, AgentState } from '../orchestrator/types.js'


export interface MockClientInstances {
  sessionCreate: MockInstance
  sessionPrompt: MockInstance
  sessionMessages: MockInstance
  sessionDiff: MockInstance
  sessionAbort: MockInstance
  globalEvent: MockInstance
}

export interface MockClient {
  client: {
    session: {
      create: MockInstance
      prompt: MockInstance
      messages: MockInstance
      diff: MockInstance
      abort: MockInstance
    }
    global: {
      event: MockInstance
    }
  }
  mocks: MockClientInstances
  setEventStream: (events: Record<string, unknown>[]) => void
  cancelEventStream: () => void
}

export function createMockClient(): MockClient {
  const sessionCreate = vi.fn()
  const sessionPrompt = vi.fn()
  const sessionMessages = vi.fn()
  const sessionDiff = vi.fn()
  const sessionAbort = vi.fn()
  const globalEvent = vi.fn()
  let eventCancelled = false

  sessionCreate.mockResolvedValue({ data: { id: 'session-mock-001' } })
  sessionPrompt.mockResolvedValue(undefined)
  sessionMessages.mockResolvedValue({ data: { items: [] } })
  sessionDiff.mockResolvedValue({ data: [] })
  sessionAbort.mockResolvedValue(undefined)

  const client = {
    session: {
      create: sessionCreate as unknown as MockInstance,
      prompt: sessionPrompt as unknown as MockInstance,
      messages: sessionMessages as unknown as MockInstance,
      diff: sessionDiff as unknown as MockInstance,
      abort: sessionAbort as unknown as MockInstance,
    },
    global: {
      event: globalEvent as unknown as MockInstance,
    },
  }

  return {
    client: client as MockClient['client'],
    mocks: {
      sessionCreate, sessionPrompt, sessionMessages, sessionDiff, sessionAbort, globalEvent,
    },
    setEventStream(events: Record<string, unknown>[]) {
      eventCancelled = false
      const asyncIterable = {
        [Symbol.asyncIterator]() {
          let index = 0
          return {
            next: async () => {
              if (eventCancelled || index >= events.length) {
                return { value: undefined, done: true }
              }
              return { value: events[index++], done: false }
            },
            return: async () => {
              eventCancelled = true
              return { value: undefined, done: true }
            },
          }
        },
      }
      globalEvent.mockResolvedValue({ stream: asyncIterable })
    },
    cancelEventStream() {
      eventCancelled = true
    },
  }
}

export function createMockCallbacks() {
  return {
    onStateChange: vi.fn(),
    onTimeline: vi.fn(),
    onStreamDelta: vi.fn(),
    onAgentStateChange: vi.fn(),
  }
}

export function createOrchestratorWithMockClient() {
  const mockClient = createMockClient()
  const callbacks = createMockCallbacks()
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = FULL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      dependsOn TEXT NOT NULL DEFAULT '[]', sessionId TEXT, retryCount INTEGER NOT NULL DEFAULT 0,
      maxRetries INTEGER NOT NULL DEFAULT 10, error TEXT, permission TEXT NOT NULL DEFAULT 'safe',
      budget REAL NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agents (
      sessionId TEXT PRIMARY KEY, taskId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'creating',
      startTime INTEGER NOT NULL, model TEXT, provider TEXT, lastHeartbeat INTEGER NOT NULL,
      watchdogTimeout INTEGER NOT NULL DEFAULT 120000, healthStatus TEXT NOT NULL DEFAULT 'healthy'
    );
    CREATE TABLE IF NOT EXISTS timeline (
      id TEXT PRIMARY KEY, time INTEGER NOT NULL, source TEXT NOT NULL, sessionId TEXT,
      type TEXT NOT NULL, message TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL, action TEXT NOT NULL,
      feedback TEXT, reviewer TEXT NOT NULL DEFAULT 'user', reviewedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY, description TEXT NOT NULL, cronExpr TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'safe', budget REAL NOT NULL DEFAULT 0,
      maxRetries INTEGER NOT NULL DEFAULT 10, enabled INTEGER NOT NULL DEFAULT 1,
      lastTriggered INTEGER NOT NULL DEFAULT 0
    );
  `)
  const orchestrator = new Orchestrator(mockClient.client as never, callbacks, db)
  return { orchestrator, mockClient, callbacks, db: db as DatabaseType }
}
