import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import type { AgentState, TimelineEntry } from '../orchestrator/types.js'

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
 * 关键事件：
 * - text delta → 实时流式输出
 * - tool called / shell started → 时间线记录
 * - idle → 触发结果评估
 * - error → 触发重试逻辑
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
          handlers.onSessionError?.(sessionId, payload)
          break
      }
    }
  } catch (err) {
    if (!signal?.aborted) {
      console.error('[events] SSE stream error:', err)
    }
  }
}
