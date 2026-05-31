import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import { getSessionMessages, getSessionDiff } from '../orchestrator/acp-manager.js'
import type { TaskResult } from '../orchestrator/types.js'
import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()

/**
 * 评估子 Agent 的任务完成情况。
 * 并行拉取消息历史和 diff，从中提取：
 * - summary: Agent 最后一次回复的总结
 * - artifacts: 本次变更涉及的文件列表
 * - cost: 本次会话的 token 费用
 */
export async function evaluateTaskCompletion(
  client: OpencodeClient,
  sessionId: string,
): Promise<TaskResult> {
  const [messagesData, diffData] = await Promise.all([
    getSessionMessages(client, sessionId),
    getSessionDiff(client, sessionId),
  ])

  const messages = Array.isArray(messagesData) ? messagesData : (messagesData as { items?: unknown[] })?.items || []
  const diff = Array.isArray(diffData) ? diffData : (diffData as { data?: unknown[] })?.data || []

  const assistantMessages = messages
    .filter((m: { role?: string }) => m?.role === 'assistant')
  const lastMessage = assistantMessages[assistantMessages.length - 1] as Record<string, unknown> | undefined

  const artifacts: string[] = []
  let cost = 0
  let summary = ''

  if (lastMessage?.summary && typeof lastMessage.summary === 'object') {
    summary = (lastMessage.summary as Record<string, unknown>).body as string || ''
  }

  if (typeof lastMessage?.cost === 'number') {
    cost = lastMessage.cost
  }

  const tokens = lastMessage?.tokens as { input: number; output: number } | undefined

  // DeepSeek V4 Flash 定价（元/百万tokens）
  // 缓存未命中: 输入 1元/M, 输出 2元/M
  // 缓存命中: 输入 0.02元/M, 输出 2元/M
  if (tokens && typeof tokens.input === 'number' && typeof tokens.output === 'number') {
    const inputCost = (tokens.input / 1_000_000) * 1    // 未缓存
    const outputCost = (tokens.output / 1_000_000) * 2   // 输出
    cost = inputCost + outputCost
  }

  if (diff && Array.isArray(diff)) {
    for (const d of diff) {
      if (d?.file) artifacts.push(d.file as string)
    }
  }

  return {
    summary,
    artifacts,
    cost,
    tokens,
  }
}
