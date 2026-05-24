// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket.js'

describe('useWebSocket', () => {
  let mockWs: {
    onopen: (() => void) | null
    onclose: ((event: { code: number; reason: string }) => void) | null
    onmessage: ((event: { data: string }) => void) | null
    onerror: (() => void) | null
    readyState: number
    close: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockWs = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      readyState: 0,
      close: vi.fn(),
      send: vi.fn(),
    }
    const MockConstructor = function (_url: string) {
      setTimeout(() => {
        // simulate async connection - but we trigger events manually
      }, 0)
      return mockWs
    } as unknown as typeof WebSocket
    MockConstructor.CONNECTING = 0
    MockConstructor.OPEN = 1
    MockConstructor.CLOSING = 2
    MockConstructor.CLOSED = 3
    vi.stubGlobal('WebSocket', MockConstructor)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket('ws://test'))
    expect(result.current.connected).toBe(false)
    expect(result.current.isReconnecting).toBe(false)
    expect(result.current.reconnectAttempts).toBe(0)
    expect(result.current.lastConnectedAt).toBeNull()
  })

  it('sets connected=true and records lastConnectedAt on open', () => {
    const { result } = renderHook(() => useWebSocket('ws://test'))

    act(() => {
      mockWs.onopen?.()
    })

    expect(result.current.connected).toBe(true)
    expect(result.current.isReconnecting).toBe(false)
    expect(result.current.lastConnectedAt).not.toBeNull()
  })

  it('sets connected=false and increments reconnectAttempts on close', () => {
    const { result } = renderHook(() => useWebSocket('ws://test'))

    act(() => { mockWs.onopen?.() })
    expect(result.current.connected).toBe(true)

    act(() => {
      mockWs.onclose?.({ code: 1006, reason: 'abnormal' })
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.isReconnecting).toBe(true)
    expect(result.current.reconnectAttempts).toBe(1)
  })

  it('processes incoming JSON messages via lastMessage', () => {
    const { result } = renderHook(() => useWebSocket('ws://test'))

    act(() => { mockWs.onopen?.() })

    act(() => {
      mockWs.onmessage?.({ data: JSON.stringify({ type: 'connected', clientId: 'abc', state: {} }) })
    })

    expect(result.current.lastMessage).toEqual({ type: 'connected', clientId: 'abc', state: {} })
  })

  it('ignores non-JSON messages', () => {
    const { result } = renderHook(() => useWebSocket('ws://test'))

    act(() => { mockWs.onopen?.() })
    act(() => { mockWs.onmessage?.({ data: 'not json' }) })

    expect(result.current.lastMessage).toBeNull()
  })
})
