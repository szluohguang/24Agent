import { useEffect, useRef, useCallback, useState } from 'react'

/** WebSocket 消息类型定义，与服务端保持一致的协议 */
export type WsMessage =
  | { type: 'connected'; clientId: string; state: unknown }
  | { type: 'state-update' }
  | { type: 'timeline'; entry: unknown }
  | { type: 'stream-delta'; sessionId: string; delta: string }
  | { type: 'agent-state'; sessionId: string; state: unknown }
  | { type: 'error'; message: string }

/**
 * WebSocket 连接钩子：
 * - 自动连接和 3 秒自动重连
 * - 每次收到消息更新 lastMessage（触发消费方 useEffect）
 * - 提供 send 方法用于发送 JSON 消息
 */
export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        setLastMessage(msg)
      } catch {
        // 非 JSON 消息（如心跳）直接忽略
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

  return { connected, lastMessage, send }
}
