import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import type { Orchestrator } from '../orchestrator/core.js'
import type { TimelineEntry, AgentState } from '../orchestrator/types.js'
import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()

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

    socket.on('message', async (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString())
        await handleWsMessage(socket, orchestrator, msg)
      } catch (err) {
        socket.send(JSON.stringify({
          type: 'error',
          message: err instanceof Error ? err.message : 'invalid message',
        }))
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
async function handleWsMessage(
  socket: WebSocket,
  orchestrator: Orchestrator,
  msg: { type: string; [key: string]: unknown },
) {
  switch (msg.type) {
    case 'create-task':
      orchestrator.addTask(msg.description as string, (msg.dependsOn as string[]) || [])
      break
    case 'dispatch-task':
      await orchestrator.dispatchTask(msg.taskId as string)
      break
    case 'abort-task':
      await orchestrator.abortTask(msg.taskId as string)
      break
    case 'set-permission':
      orchestrator.setPermissionLevel(msg.level as 'trusted' | 'safe' | 'strict')
      break
    case 'continue-prompt': {
      const prompt = msg.prompt as string
      if (prompt.startsWith('/')) {
        const result = await orchestrator.getSlashHandler().execute(prompt)
        if (result.handled) {
          broadcastToClients({
            type: 'chunk-delta',
            sessionId: msg.sessionId || 'slash',
            chunk: { type: 'text', content: `\n${result.reply}\n` },
          })
        }
      } else {
        await orchestrator.continuePrompt(msg.sessionId as string, prompt)
        socket.send(JSON.stringify({ type: 'follow-up-prompt', sessionId: msg.sessionId, prompt }))
      }
      break
    }
    case 'schedule-task':
      orchestrator.addSchedule(
        msg.description as string,
        msg.cronExpr as string,
        msg.permission as 'trusted' | 'safe' | 'strict' | undefined,
      )
      socket.send(JSON.stringify({ type: 'schedule-created', success: true }))
      break
    case 'list-schedules':
      socket.send(JSON.stringify({ type: 'schedules', schedules: orchestrator.getSchedules() }))
      break
    case 'delete-task':
      orchestrator.deleteTask(msg.taskId as string)
      socket.send(JSON.stringify({ type: 'task-deleted', taskId: msg.taskId }))
      break
    case 'delete-schedule':
      orchestrator.deleteSchedule(msg.id as string)
      socket.send(JSON.stringify({ type: 'schedule-deleted', id: msg.id }))
      break
    case 'set-budget':
      orchestrator.setBudgetLimit(msg.limit as number)
      socket.send(JSON.stringify({ type: 'budget-updated', limit: msg.limit }))
      break
    case 'reset-budget':
      orchestrator.resetBudget()
      socket.send(JSON.stringify({ type: 'budget-reset' }))
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
export function createBroadcastCallbacks(getState?: () => unknown) {
  return {
    onStateChange: () => {
      if (getState) {
        broadcastToClients({ type: 'state-update', state: getState() })
      } else {
        broadcastToClients({ type: 'state-update' })
      }
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
    onChunk: (sessionId: string, chunk: { type: string; content: string; toolName?: string }) => {
      broadcastToClients({ type: 'chunk-delta', sessionId, chunk })
    },
  }
}
