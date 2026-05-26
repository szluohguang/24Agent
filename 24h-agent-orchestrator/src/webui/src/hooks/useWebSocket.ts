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

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

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
