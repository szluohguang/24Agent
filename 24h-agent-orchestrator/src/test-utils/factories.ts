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
  const orchestrator = new Orchestrator(mockClient.client as never, callbacks)
  return { orchestrator, mockClient, callbacks }
}
