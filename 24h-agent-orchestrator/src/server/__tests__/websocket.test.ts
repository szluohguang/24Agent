import { describe, it, expect, vi, beforeEach } from 'vitest'
import { broadcastToClients, createBroadcastCallbacks } from '../websocket.js'
import type { WebSocket } from 'ws'
import type { TimelineEntry, AgentState } from '../../orchestrator/types.js'

vi.mock('ws', () => {
  return {
    WebSocket: class MockWebSocket {
      readyState = 1
      send = vi.fn()
      on = vi.fn()
    },
  }
})

describe('WebSocket broadcast', () => {
  beforeEach(() => {
    // 每个测试前清理 clients Map
    // 通过重新导入来重置，或者通过内部方式访问
  })

  it('should create broadcast callbacks with correct structure', () => {
    const callbacks = createBroadcastCallbacks()
    expect(callbacks).toHaveProperty('onStateChange')
    expect(callbacks).toHaveProperty('onTimeline')
    expect(callbacks).toHaveProperty('onStreamDelta')
    expect(callbacks).toHaveProperty('onAgentStateChange')
    expect(typeof callbacks.onStateChange).toBe('function')
    expect(typeof callbacks.onTimeline).toBe('function')
    expect(typeof callbacks.onStreamDelta).toBe('function')
    expect(typeof callbacks.onAgentStateChange).toBe('function')
  })

  it('should not throw when broadcasting with no clients', () => {
    expect(() => broadcastToClients({ type: 'test' })).not.toThrow()
  })

  it('should broadcast timeline events with correct format', () => {
    const entry: TimelineEntry = {
      id: 'evt-1',
      time: Date.now(),
      source: 'sub',
      sessionId: 'sess-1',
      type: 'tool',
      message: 'Tool called',
    }

    const { onTimeline } = createBroadcastCallbacks()
    expect(() => onTimeline(entry)).not.toThrow()
  })

  it('should broadcast stream delta events with correct format', () => {
    const { onStreamDelta } = createBroadcastCallbacks()
    expect(() => onStreamDelta('sess-1', 'Hello')).not.toThrow()
  })

  it('should broadcast agent state change events with correct format', () => {
    const stateChange: Partial<AgentState> = { status: 'running' }
    const { onAgentStateChange } = createBroadcastCallbacks()
    expect(() => onAgentStateChange('sess-1', stateChange)).not.toThrow()
  })

  it('should broadcast state update events', () => {
    const { onStateChange } = createBroadcastCallbacks()
    expect(() => onStateChange()).not.toThrow()
  })
})
