import { describe, it, expect, beforeEach, vi } from 'vitest'
import { subscribeGlobalEvents } from '../event-stream.js'
import type { EventHandlers } from '../event-stream.js'

function makeEvent(payload: Record<string, unknown>) {
  return { payload }
}

describe('subscribeGlobalEvents()', () => {
  let handlers: EventHandlers
  let mockClient: {
    global: {
      event: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    handlers = {
      onTextDelta: vi.fn(),
      onToolCalled: vi.fn(),
      onShellStarted: vi.fn(),
      onShellEnded: vi.fn(),
      onSessionIdle: vi.fn(),
      onSessionError: vi.fn(),
      onTimeline: vi.fn(),
      onAgentStateChange: vi.fn(),
    }

    mockClient = {
      global: {
        event: vi.fn(),
      },
    }
  })

  it('should process text delta events', async () => {
    const events = [
      makeEvent({ type: 'session.next.text.delta', sessionID: 'sess-1', delta: 'Hello ' }),
      makeEvent({ type: 'session.next.text.delta', sessionID: 'sess-1', delta: 'World' }),
    ]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onTextDelta).toHaveBeenCalledTimes(2)
    expect(handlers.onTextDelta).toHaveBeenNthCalledWith(1, 'sess-1', 'Hello ')
    expect(handlers.onTextDelta).toHaveBeenNthCalledWith(2, 'sess-1', 'World')
  })

  it('should process tool called events', async () => {
    const events = [
      makeEvent({ type: 'session.next.tool.called', sessionID: 'sess-1', tool: 'read', input: { file: 'test.ts' } }),
    ]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onToolCalled).toHaveBeenCalledWith('sess-1', 'read', { file: 'test.ts' })
    expect(handlers.onTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tool', message: 'Tool: read', source: 'sub', sessionId: 'sess-1' }),
    )
  })

  it('should process shell started events', async () => {
    const events = [
      makeEvent({ type: 'session.next.shell.started', sessionID: 'sess-1', command: 'npm test' }),
    ]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onShellStarted).toHaveBeenCalledWith('sess-1', 'npm test')
    expect(handlers.onTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'shell', message: '$ npm test' }),
    )
  })

  it('should process shell ended events', async () => {
    const events = [
      makeEvent({ type: 'session.next.shell.ended', sessionID: 'sess-1', output: 'All tests passed' }),
    ]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onShellEnded).toHaveBeenCalledWith('sess-1', 'All tests passed')
  })

  it('should process session idle events', async () => {
    const events = [
      makeEvent({ type: 'session.idle', sessionID: 'sess-1' }),
    ]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onSessionIdle).toHaveBeenCalledWith('sess-1')
    expect(handlers.onTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'idle', source: 'system', sessionId: 'sess-1' }),
    )
  })

  it('should process session error events', async () => {
    const errorPayload = { type: 'session.error', sessionID: 'sess-1', error: 'Something went wrong' }
    const events = [makeEvent(errorPayload)]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onSessionError).toHaveBeenCalledWith('sess-1', errorPayload)
  })

  it('should process session.next.step.failed as error', async () => {
    const events = [
      makeEvent({ type: 'session.next.step.failed', sessionID: 'sess-1' }),
    ]

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= events.length) return { value: undefined, done: true }
                return { value: events[i++], done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onSessionError).toHaveBeenCalledWith('sess-1', expect.objectContaining({ type: 'session.next.step.failed' }))
  })

  it('should stop processing when signal is aborted', async () => {
    const ac = new AbortController()
    const events = Array(10).fill(null).map((_, i) =>
      makeEvent({ type: 'session.next.text.delta', sessionID: 'sess-1', delta: `chunk-${i}` }),
    )

    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let index = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (index >= events.length) return { value: undefined, done: true }
                return { value: events[index++], done: false }
              },
            }
          },
        }
      })(),
    })

    const promise = subscribeGlobalEvents(mockClient as never, handlers, ac.signal)
    ac.abort()
    await promise

    expect(handlers.onTextDelta).not.toHaveBeenCalled()
  })

  it('should skip events without payload', async () => {
    mockClient.global.event.mockResolvedValue({
      stream: (() => {
        let i = 0
        return {
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                if (i >= 2) return { value: undefined, done: true }
                const val = i === 0 ? { payload: null } : { }
                i++
                return { value: val, done: false }
              },
            }
          },
        }
      })(),
    })

    await subscribeGlobalEvents(mockClient as never, handlers)

    expect(handlers.onTextDelta).not.toHaveBeenCalled()
    expect(handlers.onSessionIdle).not.toHaveBeenCalled()
  })
})
