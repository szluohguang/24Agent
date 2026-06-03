import { useEffect, useRef, useCallback, useState } from 'react'

export type WsMessage =
  | { type: 'connected'; clientId: string; state: unknown }
  | { type: 'state-update' }
  | { type: 'timeline'; entry: unknown }
  | { type: 'stream-delta'; sessionId: string; delta: string }
  | { type: 'agent-state'; sessionId: string; state: unknown }
  | { type: 'health-report'; data: unknown }
  | { type: 'error'; message: string }
  | { type: 'follow-up-prompt'; sessionId: string; prompt: string }
  | { type: 'comet-state-update'; state: import('../types').CometEngineState }

/**
 * useWebSocket — WebSocket 连接管理 hook。
 * 支持自动重连、消息解析、流式 delta 回调。
 *
 * onStreamDelta 回调通过 ref 存储，直接从 ws.onmessage 触发，
 * 避免 React 18 批处理丢包，同时避免 options 对象引用变化导致无限重连。
 */
export function useWebSocket(
  url: string,
  options?: { onStreamDelta?: (sessionId: string, delta: string) => void },
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const onStreamDeltaRef = useRef(options?.onStreamDelta)
  onStreamDeltaRef.current = options?.onStreamDelta

  const connect = useCallback(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
      setIsReconnecting(false)
      setReconnectAttempts(0)
      setLastConnectedAt(Date.now())
    }

    ws.onclose = () => {
      setConnected(false)
      setIsReconnecting(true)
      setReconnectAttempts((prev) => prev + 1)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        // stream-delta 通过 ref 中的回调直接更新 state，绕过 lossy setLastMessage
        if (msg.type === 'stream-delta' && onStreamDeltaRef.current) {
          onStreamDeltaRef.current(msg.sessionId, msg.delta)
        }
        setLastMessage(msg)
      } catch {
        // non-JSON messages (e.g. heartbeats) ignored
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, lastMessage, send, isReconnecting, reconnectAttempts, lastConnectedAt }
}
