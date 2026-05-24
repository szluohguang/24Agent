import { createOpencode as createOpencodeV2 } from '@opencode-ai/sdk/v2'
import type { PermissionLevel } from './types.js'

/**
 * 三档权限规则的定于。
 * safe 级别允许常规操作（读写、bash），只有危险模式（rm -rf、git push 等）需要审批。
 */
const PERMISSION_RULES: Record<PermissionLevel, Array<{ permission: string; pattern: string; action: string }>> = {
  trusted: [
    { permission: '*', pattern: '**', action: 'allow' },
  ],
  safe: [
    { permission: 'read', pattern: '**', action: 'allow' },
    { permission: 'edit', pattern: '**', action: 'allow' },
    { permission: 'glob', pattern: '**', action: 'allow' },
    { permission: 'grep', pattern: '**', action: 'allow' },
    { permission: 'list', pattern: '**', action: 'allow' },
    { permission: 'bash', pattern: '**', action: 'allow' },
    { permission: 'question', pattern: '**', action: 'allow' },
    { permission: 'webfetch', pattern: '**', action: 'allow' },
  ],
  strict: [
    { permission: '*', pattern: '**', action: 'ask' },
  ],
}

/** 启动 opencode ACP 服务（内部调用 `opencode serve`） */
export async function createOpencodeServer() {
  const { client, server } = await createOpencodeV2({
    hostname: '127.0.0.1',
    port: 4096,
  })
  return { client, server }
}

export function buildPermissionRuleset(level: PermissionLevel) {
  return PERMISSION_RULES[level]
}

// SDK 的返回类型是条件类型，简化后用 any 避免深层类型推导问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/** 创建子 Agent 的 ACP 会话，注入权限规则 */
export async function createSubAgentSession(
  client: AnyClient,
  taskId: string,
  model: { providerID: string; modelID: string },
  permissionLevel: PermissionLevel,
) {
  const result = await client.session.create({
    title: `Task: ${taskId}`,
    model: { id: model.modelID, providerID: model.providerID },
    permission: buildPermissionRuleset(permissionLevel),
  })

  const data = result?.data ?? result
  return data as { id: string }
}

/** 向指定会话发送任务 prompt */
export async function sendTaskPrompt(
  client: AnyClient,
  sessionId: string,
  promptText: string,
) {
  return client.session.prompt({
    sessionID: sessionId,
    parts: [{ type: 'text', text: promptText }],
  })
}

/** 拉取会话的消息历史 */
export async function getSessionMessages(
  client: AnyClient,
  sessionId: string,
) {
  const result = await client.session.messages({ sessionID: sessionId, limit: 50 })
  return result?.data ?? result
}

/** 获取会话产生的代码变更 diff */
export async function getSessionDiff(
  client: AnyClient,
  sessionId: string,
) {
  const result = await client.session.diff({ sessionID: sessionId })
  return result?.data ?? result
}

/** 强制中止运行中的会话 */
export async function abortSession(
  client: AnyClient,
  sessionId: string,
) {
  return client.session.abort({ sessionID: sessionId })
}
