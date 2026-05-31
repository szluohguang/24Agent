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
  const sseResult = await client.global.event()

  const stream = sseResult.stream
  try {
    for await (const event of stream) {
      if (signal?.aborted) break
      if (!event) continue

      const evt = event as Record<string, unknown>
      const payload = evt.payload as Record<string, unknown> | undefined
      if (!payload) continue

      const type = payload.type as string | undefined
      const sessionId = (payload.sessionID as string) || ''

      // 任意事件都通知 HealthMonitor 刷新最后活跃时间
      handlers.onAnyEvent?.(sessionId)

      switch (type) {
        case 'session.next.text.delta':
          handlers.onTextDelta?.(sessionId, (payload.delta as string) || '')
          break

        case 'session.next.tool.called':
          handlers.onToolCalled?.(sessionId, (payload.tool as string) || '', payload.input)
          handlers.onTimeline?.({
            id: crypto.randomUUID(),
            time: Date.now(),
            source: 'sub',
            sessionId,
            type: 'tool',
            message: `Tool: ${payload.tool}`,
          })
          break

        case 'session.next.shell.started':
          handlers.onShellStarted?.(sessionId, (payload.command as string) || '')
          handlers.onTimeline?.({
            id: crypto.randomUUID(),
            time: Date.now(),
            source: 'sub',
            sessionId,
            type: 'shell',
            message: `$ ${payload.command}`,
          })
          break

        case 'session.next.shell.ended':
          handlers.onShellEnded?.(sessionId, (payload.output as string) || '')
          break

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

        case 'session.next.step.failed':
        case 'session.error':
          logger.error('session-error', `Session error: ${sessionId.slice(0, 8)}`, { type, sessionId })
          handlers.onSessionError?.(sessionId, payload)
          break
      }
    }
  } catch (err) {
    if (!signal?.aborted) {
      logger.error('session-error', 'SSE stream error', { error: err instanceof Error ? err.message : String(err) })
    }
  }
}
