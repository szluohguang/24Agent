import { createOpencodeClient, createOpencodeServer as createOcServer } from '@opencode-ai/sdk/v2'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
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
export async function createOpencodeServer(projectDir?: string) {
  freePort(4096)

  // opencode serve 默认无需密码，删除密码环境变量避免鉴权
  delete process.env['OPENCODE_SERVER_PASSWORD']

  const envModel = process.env['ACP_MODEL'] || process.env['OPENCODE_MODEL'] || 'deepseek/deepseek-chat'

  // 如果设置了项目目录，ACP server 的工作目录将切换到项目目录
  const originalCwd = process.cwd()
  if (projectDir) {
    try {
      if (fs.existsSync(projectDir)) {
        process.chdir(projectDir)
        logger.info('startup', `ACP server working directory: ${projectDir}`)
      }
    } catch (e) {
      logger.warn('startup', `Cannot chdir to project dir: ${projectDir}`, { error: String(e) })
    }
  }

  const server = await createOcServer({
    hostname: '127.0.0.1',
    port: 4096,
    config: { model: envModel },
  })

  // ACP server 启动后恢复原始工作目录
  if (projectDir) process.chdir(originalCwd)

  const client = createOpencodeClient({
    baseUrl: server.url,
  })

  logger.info('startup', `opencode ACP server: ${server.url} (model: ${envModel})${projectDir ? ` [projectDir: ${projectDir}]` : ''}`)
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
  taskTitle?: string,
) {
  // SDK v2 中有两个 session 类: session(基本) 和 session2(完整 CRUD + ACP)
  // create/prompt/messages/diff/abort 都在 session2 上
  const sessionApi = client.session2 ?? client.session
  const title = taskTitle
    ? taskTitle.length > 60 ? taskTitle.slice(0, 57) + '...' : taskTitle
    : `Task: ${taskId}`
  const result = await sessionApi.create({ title })

  // 检查 SDK 显式错误
  const raw = result as Record<string, unknown> | undefined
  const err = raw?.error
  if (err && typeof err === 'object' && Object.keys(err as object).length > 0) {
    throw new Error(`ACP session error: ${JSON.stringify(err)}`)
  }

  // SDK v2 成功创建 session 后，Session 对象在 data 字段
  // 兜底尝试 response 和原始对象
  const data = (raw?.data as Record<string, unknown> | undefined)
    ?? (raw?.response as Record<string, unknown> | undefined)
    ?? raw
  const sessionId = typeof data?.id === 'string' ? data.id
    : typeof data?.sessionID === 'string' ? data.sessionID
    : undefined

  if (!sessionId) {
    const keys = raw ? Object.keys(raw).join(',') : 'null'
    const dataKeys = data ? Object.keys(data).join(',') : 'null'
    throw new Error(
      `ACP session creation failed — top keys: [${keys}], data keys: [${dataKeys}]`
    )
  }

  return { id: sessionId }
}

/** 获取 SDK v2 的正确 session API（session2 包含完整 CRUD + ACP） */
function getSessionApi(client: AnyClient) {
  return client.session2 ?? client.session
}

/** 向指定会话发送任务 prompt（文本消息） */
export async function sendTaskPrompt(
  client: AnyClient,
  sessionId: string,
  promptText: string,
) {
  return getSessionApi(client).prompt({
    sessionID: sessionId,
    parts: [{ type: 'text', text: promptText }],
  })
}

/** 拉取会话的完整消息历史，用于结果评估 */
export async function getSessionMessages(
  client: AnyClient,
  sessionId: string,
) {
  const result = await getSessionApi(client).messages({ sessionID: sessionId, limit: 50 })
  return result?.data ?? result
}

/** 获取会话产生的代码变更 diff，用于审计和展示 */
export async function getSessionDiff(
  client: AnyClient,
  sessionId: string,
) {
  const result = await getSessionApi(client).diff({ sessionID: sessionId })
  return result?.data ?? result
}

/** 强制中止运行中的 ACP 会话 */
export async function abortSession(
  client: AnyClient,
  sessionId: string,
) {
  return getSessionApi(client).abort({ sessionID: sessionId })
}
