import { createOpencode as createOpencodeV2 } from '@opencode-ai/sdk/v2'
import { execSync } from 'node:child_process'
import type { PermissionLevel } from './types.js'
import { Logger } from './logger.js'

const logger = Logger.getInstance()

/**
 * 三档权限规则定义。
 * - trusted: 全自动，允许所有操作
 * - safe: 常规操作（读写 bash 等）自动放行，危险操作需审批
 * - strict: 每步操作都需确认
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

/**
 * 释放指定端口：查找占用该端口的进程并强制终止。
 * 此端口由本 orchestrator 独占使用，不会误杀外部进程。
 */
export function freePort(port: number): void {
  try {
    const isWin = process.platform === 'win32'
    const cmd = isWin
      ? `netstat -ano | findstr ":${port} " | findstr "LISTENING"`
      : `lsof -ti:${port}`
    const output = execSync(cmd, { encoding: 'utf8', timeout: 3000 }).trim()
    if (!output) return
    const pids = output.split(/\r?\n/).map((line) => {
      if (isWin) {
        const parts = line.trim().split(/\s+/)
        return parseInt(parts[parts.length - 1], 10)
      }
      return parseInt(line.trim(), 10)
    }).filter((pid) => !isNaN(pid) && pid > 0)
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM')
        logger.info('startup', `Killed stale process ${pid} on port ${port}`)
      } catch {
        // 进程已自然结束
      }
    }
  } catch {
    // 无进程占用或命令执行失败
  }
}

/** 启动 opencode ACP 服务，通过 SDK 内部拉起 `opencode serve` */
export async function createOpencodeServer() {
  // 清理本 orchestrator 独占端口上的残留进程，避免 port conflict 导致启动失败
  freePort(4096)

  if (!process.env['OPENCODE_SERVER_PASSWORD']) {
    process.env['OPENCODE_SERVER_PASSWORD'] = 'orchestrator-dev'
    logger.info('startup', 'OPENCODE_SERVER_PASSWORD set to default (orchestrator-dev)')
  }

  const { client, server } = await createOpencodeV2({
    hostname: '127.0.0.1',
    port: 4096,
  })
  return { client, server }
}

/** 按权限级别生成 SDK 所需的 permission ruleset 数组 */
export function buildPermissionRuleset(level: PermissionLevel) {
  return PERMISSION_RULES[level]
}

/*
 * SDK 的返回类型是条件类型，嵌套很深。
 * 这里用 any 避免深层类型推导问题，实际运行时类型仍是正确的。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/** 创建子 Agent 的 ACP 会话，注入指定模型和权限规则 */
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

/** 向指定会话发送任务 prompt（文本消息） */
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

/** 拉取会话的完整消息历史，用于结果评估 */
export async function getSessionMessages(
  client: AnyClient,
  sessionId: string,
) {
  const result = await client.session.messages({ sessionID: sessionId, limit: 50 })
  return result?.data ?? result
}

/** 获取会话产生的代码变更 diff，用于审计和展示 */
export async function getSessionDiff(
  client: AnyClient,
  sessionId: string,
) {
  const result = await client.session.diff({ sessionID: sessionId })
  return result?.data ?? result
}

/** 强制中止运行中的 ACP 会话 */
export async function abortSession(
  client: AnyClient,
  sessionId: string,
) {
  return client.session.abort({ sessionID: sessionId })
}
