import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import type { Orchestrator } from '../orchestrator/core.js'
import type { TimelineEntry, AgentState } from '../orchestrator/types.js'

interface WsClient {
  ws: WebSocket
  id: string
}

// 所有连接的 WebUI 客户端，由 clientId 索引
const clients: Map<string, WsClient> = new Map()

/**
 * 注册 WebSocket 端点 /ws：
 * - 新连接收到完整当前状态
 * - 来自客户端的消息（create-task / dispatch-task 等）直接调用 Orchestrator
 */
export function registerWebSocket(
  app: FastifyInstance,
  orchestrator: Orchestrator,
) {
  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    const clientId = crypto.randomUUID()
    clients.set(clientId, { ws: socket, id: clientId })

    socket.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString())
        handleWsMessage(socket, orchestrator, msg)
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'invalid JSON' }))
      }
    })

    socket.on('close', () => {
      clients.delete(clientId)
    })

    // 连接时推送当前状态，WebUI 无需单独拉取
    socket.send(JSON.stringify({
      type: 'connected',
      clientId,
      state: orchestrator.getState(),
    }))
  })
}

/** 根据消息类型分发到 Orchestrator 的对应方法 */
function handleWsMessage(
  socket: WebSocket,
  orchestrator: Orchestrator,
  msg: { type: string; [key: string]: unknown },
) {
  switch (msg.type) {
    case 'create-task':
      orchestrator.addTask(msg.description as string, (msg.dependsOn as string[]) || [])
      break
    case 'dispatch-task':
      orchestrator.dispatchTask(msg.taskId as string)
      break
    case 'abort-task':
      orchestrator.abortTask(msg.taskId as string)
      break
    case 'set-permission':
      orchestrator.setPermissionLevel(msg.level as 'trusted' | 'safe' | 'strict')
      break
    default:
      socket.send(JSON.stringify({ type: 'error', message: `unknown type: ${msg.type}` }))
  }
}

/** 向所有连接的 WebUI 客户端广播消息 */
export function broadcastToClients(data: unknown) {
  const message = JSON.stringify(data)
  for (const client of clients.values()) {
    if (client.ws.readyState === 1) {
      client.ws.send(message)
    }
  }
}

/** 创建标准回调集合，将 Orchestrator 事件自动广播到所有 WebSocket 客户端 */
export function createBroadcastCallbacks() {
  return {
    onStateChange: () => {
      broadcastToClients({ type: 'state-update' })
    },
    onTimeline: (entry: TimelineEntry) => {
      broadcastToClients({ type: 'timeline', entry })
    },
    onStreamDelta: (sessionId: string, delta: string) => {
      broadcastToClients({ type: 'stream-delta', sessionId, delta })
    },
    onAgentStateChange: (sessionId: string, state: Partial<AgentState>) => {
      broadcastToClients({ type: 'agent-state', sessionId, state })
    },
  }
}
