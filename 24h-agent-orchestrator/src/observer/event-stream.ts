import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import type { AgentState, TimelineEntry } from '../orchestrator/types.js'
import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()

/** SSE 事件处理器接口，由 Orchestrator 注册对应回调 */
export interface EventHandlers {
  onTextDelta?: (sessionId: string, delta: string) => void
  onToolCalled?: (sessionId: string, toolName: string, input: unknown) => void
  onShellStarted?: (sessionId: string, command: string) => void
  onShellEnded?: (sessionId: string, output: string) => void
  onSessionIdle?: (sessionId: string) => void
  onSessionError?: (sessionId: string, error: unknown) => void
  onTimeline?: (entry: TimelineEntry) => void
  onAgentStateChange?: (sessionId: string, state: Partial<AgentState>) => void
  onAnyEvent?: (sessionId: string) => void
}

/**
 * 订阅 opencode 全局 SSE 事件流，按事件类型路由到对应处理器。
 *
 * 事件类型映射：
 * - session.next.text.delta → 实时流式输出（逐 token 推送）
 * - session.next.tool.called → Agent 正在调用工具
 * - session.next.shell.started/ended → Agent 执行 shell 命令
 * - session.idle → Agent 完成当前步骤，触发结果评估
 * - session.next.step.failed / session.error → 异常处理与重试
 */
export async function subscribeGlobalEvents(
  client: OpencodeClient,
  handlers: EventHandlers,
  signal?: AbortSignal,
) {
  logger.info('session-event', 'Subscribing to global SSE events...')
  const sseResult = await client.global.event()

  const stream = sseResult.stream
  logger.info('session-event', 'SSE stream connected')
  try {
    for await (const event of stream) {
      if (signal?.aborted) break
      if (!event) continue

      // SDK v2 事件格式: { directory, project?, workspace?, payload: { id, type, properties: { sessionID, ... } } }
      const evt = event as Record<string, unknown>
      const payload = evt.payload as Record<string, unknown> | undefined
      if (!payload) continue

      const props = payload.properties as Record<string, unknown> | undefined
      const type = payload.type as string | undefined
      const sessionId = (props?.sessionID as string) || ''

      logger.debug('session-event', `SSE event: ${type}`, { sessionId: sessionId.slice(0, 8) })

      // 任意事件都通知 HealthMonitor 刷新最后活跃时间
      handlers.onAnyEvent?.(sessionId)

      switch (type) {
        // SDK v2: 流式文本增量
        case 'session.next.text.delta':
          handlers.onTextDelta?.(sessionId, (props?.delta as string) || '')
          break

        // SDK v2: 整个消息部分更新（text / tool / shell 等）
        case 'message.part.updated': {
          const part = props?.part as Record<string, unknown> | undefined
          const partType = part?.type as string | undefined
          if (partType === 'text') {
            const text = (part?.text as string) || ''
            if (text) handlers.onTextDelta?.(sessionId, text)
          } else if (partType === 'tool_use' || partType === 'tool_call') {
            handlers.onToolCalled?.(sessionId, (part?.name as string) || '', part?.input)
          } else if (partType === 'shell' || partType === 'bash') {
            handlers.onShellStarted?.(sessionId, (part?.command as string) || '')
          }
          break
        }

        // SDK v2: 工具调用
        case 'session.next.tool.called':
          handlers.onToolCalled?.(sessionId, (props?.tool as string) || '', props?.input)
          handlers.onTimeline?.({
            id: crypto.randomUUID(),
            time: Date.now(),
            source: 'sub',
            sessionId,
            type: 'tool',
            message: `Tool: ${props?.tool}`,
          })
          break

        // SDK v2: Shell 命令开始
        case 'session.next.shell.started':
          handlers.onShellStarted?.(sessionId, (props?.command as string) || '')
          handlers.onTimeline?.({
            id: crypto.randomUUID(),
            time: Date.now(),
            source: 'sub',
            sessionId,
            type: 'shell',
            message: `$ ${props?.command}`,
          })
          break

        // SDK v2: Shell 命令结束
        case 'session.next.shell.ended':
          handlers.onShellEnded?.(sessionId, (props?.output as string) || '')
          break

        // SDK v2: Session 空闲
        case 'session.idle':
          handlers.onSessionIdle?.(sessionId)
          handlers.onTimeline?.({
            id: crypto.randomUUID(),
            time: Date.now(),
            source: 'system',
            sessionId,
            type: 'idle',
            message: `Session idle: ${sessionId.slice(0, 8)}`,
          })
          break

        // SDK v2: 步骤失败 / 会话错误
        case 'session.next.step.failed':
        case 'session.error':
          logger.error('session-event', `Session error: ${sessionId.slice(0, 8)}`, { type, sessionId })
          handlers.onSessionError?.(sessionId, payload)
          break
      }
    }
  } catch (err) {
    if (!signal?.aborted) {
      logger.error('session-event', 'SSE stream error', { error: err instanceof Error ? err.message : String(err) })
    }
  }
}
