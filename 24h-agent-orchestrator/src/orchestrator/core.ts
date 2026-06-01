import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import type Database from 'better-sqlite3'
import type { TaskState, AgentState, TimelineEntry, PermissionLevel, ScheduledTask, HealthStatus, ReviewRecord } from './types.js'
import { createSubAgentSession, sendTaskPrompt, abortSession } from './acp-manager.js'
import { evaluateTaskCompletion } from '../observer/evaluator.js'
import { subscribeGlobalEvents, type EventHandlers } from '../observer/event-stream.js'
import { Store } from './store.js'
import { HealthMonitor } from './health-monitor.js'
import { Scheduler } from './scheduler.js'
import { Recovery } from './recovery.js'
import { Logger } from './logger.js'
import { Notifier, type WebhookConfig } from '../server/notifier.js'
import { WeChatManager, type WeChatConfig, type WeChatLoginInfo } from '../wechat/manager.js'
import { SlashHandler } from '../slash/index.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const logger = Logger.getInstance()

/** 编排器状态变更时触发的回调，用于广播到 WebSocket 客户端 */
export interface OrchestratorCallbacks {
  onStateChange: () => void
  onTimeline: (entry: TimelineEntry) => void
  onStreamDelta: (sessionId: string, delta: string) => void
  onAgentStateChange: (sessionId: string, state: Partial<AgentState>) => void
  onChunk?: (sessionId: string, chunk: { type: string; content: string; toolName?: string }) => void
}

/**
 * Orchestrator — 24/7 Agent 编排核心。
 *
 * 职责：
 * - 管理任务 DAG（创建/分发/中止/重试）
 * - 通过 ACP Manager 管理子 Agent 会话生命周期
 * - 通过 Observer 订阅 SSE 事件流实现实时状态追踪
 * - 通过 HealthMonitor 检测挂起会话并触发恢复
 * - 通过 Scheduler 实现 cron 定时触发和并行度控制
 * - 通过 Recovery 实现崩溃重启后的未完成任务恢复
 * - 通过 Store 实现数据持久化
 */
export class Orchestrator {
  private client: OpencodeClient
  private tasks: Map<string, TaskState> = new Map()
  private agents: Map<string, AgentState> = new Map()
  private timeline: TimelineEntry[] = []
  private permissionLevel: PermissionLevel = 'safe'
  private budgetLimit = 50
  private budgetSpent = 0
  private maxParallel = 3
  private abortSignal: AbortController | null = null
  private callbacks: OrchestratorCallbacks
  private eventHandlers: EventHandlers
  private store: Store
  private healthMonitor: HealthMonitor
  private scheduler: Scheduler
  private recovery: Recovery
  private db: Database.Database
  private notifier: Notifier = new Notifier()
  private wechatManager: WeChatManager
  private slashHandler: SlashHandler
  private storageDir: string

  getNotifier(): Notifier {
    return this.notifier
  }

  setWebhooks(configs: WebhookConfig[]): void {
    this.notifier.setWebhooks(configs)
    this.store.setConfig('webhooks', JSON.stringify(configs))
  }

  getWebhooks(): WebhookConfig[] {
    return this.notifier.getWebhooks()
  }

  constructor(client: OpencodeClient, callbacks: OrchestratorCallbacks, database: Database.Database, storageDir?: string) {
    this.client = client
    this.callbacks = callbacks
    this.db = database
    this.storageDir = storageDir || path.join(process.cwd(), 'data')
    this.store = new Store(database)

    // 从持久化加载配置
    this.loadConfig()

    // 健康监控
    this.healthMonitor = new HealthMonitor(
      {
        onSessionHung: (sessionId) => this.handleHungSession(sessionId),
        onSseStale: () => this.recovery.attemptReconnect(),
      },
      async (sessionId) => {
        try {
          const agent = this.agents.get(sessionId)
          return agent !== undefined && agent.status !== 'error'
        } catch {
          return false
        }
      },
    )

    // 调度器
    this.scheduler = new Scheduler(
      async (description, dependsOn) => this.addTask(description, dependsOn),
      async (taskId) => this.dispatchTask(taskId),
      {
        onTaskReady: (taskId) => this.scheduler.enqueue(taskId),
        onScheduleTriggered: (description) => {
          this.addTask(description)
        },
      },
      this.maxParallel,
    )

    // 恢复器
    this.recovery = new Recovery(
      client,
      this.createEventHandlers(),
      this.store,
      {
        onTaskRecovered: (taskId) => this.scheduler.enqueue(taskId),
        onSseReconnected: () => logger.info('shutdown', 'SSE reconnected (from orchestrator)'),
      },
    )

    const defaultWechatConfig: WeChatConfig = {
      baseUrl: 'https://ilinkai.weixin.qq.com',
      cdnBaseUrl: 'https://novac2c.cdn.weixin.qq.com/c2c',
      botType: '3',
      consoleToWechat: false,
    }
    this.wechatManager = new WeChatManager(defaultWechatConfig, path.join(this.storageDir, 'wechat'), (msg) => {
      logger.info('wechat', msg)
    })
    this.slashHandler = new SlashHandler(this)

    this.loadWeChatConfig()

    this.wechatManager.setOnMessage(async (text, userId) => {
      const result = await this.slashHandler.execute(text, `wechat:${userId}`)
      if (result.handled) return result.reply

      const taskId = this.addTask(text)
      if (this.callbacks.onChunk) {
        this.callbacks.onChunk('wechat', { type: 'user', content: `📱 [微信] ${text}` })
        this.callbacks.onChunk('wechat', { type: 'text', content: `任务 **${taskId}** 已创建，处理完成后会自动回复。` })
      }
      return `✅ 任务已创建: **${taskId}**，处理完成后会自动回复。`
    })

    this.eventHandlers = this.createEventHandlers()
  }

  getWeChatManager(): WeChatManager {
    return this.wechatManager
  }

  getSlashHandler(): SlashHandler {
    return this.slashHandler
  }

  /** 组装 SSE 事件处理器集合：将事件流路由到 Orchestrator 内部方法和回调 */
  private createEventHandlers(): EventHandlers {
    return {
      onTextDelta: (sessionId, delta) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.stream.push(delta)
          logger.debug('stream', delta, { sessionId })
          this.callbacks.onStreamDelta(sessionId, delta)
        }
      },
      onSessionIdle: (sessionId) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.status = 'idle'
          agent.healthStatus = 'healthy'
          agent.lastHeartbeat = Date.now()
          this.store.updateAgent(agent)
          this.callbacks.onAgentStateChange(sessionId, { status: 'idle' })
          this.handleSessionComplete(sessionId)
        }
      },
      onSessionError: (sessionId, error) => {
        const agent = this.agents.get(sessionId)
        if (agent) {
          agent.status = 'error'
          agent.healthStatus = 'dead'
          this.store.updateAgent(agent)
          this.callbacks.onAgentStateChange(sessionId, { status: 'error' })
          this.handleSessionError(sessionId, error)
        }
      },
      onTimeline: (entry) => {
        this.addTimeline(entry.source, entry.sessionId || '', entry.type, entry.message)
      },
      onAnyEvent: (sessionId) => {
        if (sessionId) this.healthMonitor.notifySessionEvent(sessionId)
        this.healthMonitor.onSseEvent()
      },
      onChunk: (sessionId, chunk) => {
        if (this.callbacks.onChunk) {
          this.callbacks.onChunk(sessionId, chunk)
        }
        if (this.wechatManager.isLoggedIn() && this.wechatManager.getConfig().consoleToWechat) {
          const streamLevel = this.store.getConfig('wechat_stream_level') || 'thinking'
          if (streamLevel !== 'off') {
            const userId = this.wechatManager.getFirstContactUserId() || this.wechatManager.getLoginInfo()!.userId
            this.wechatManager.streamToUser(userId, sessionId, chunk, streamLevel)
          }
        }
      },
    }
  }

  private loadWeChatConfig() {
    const baseUrl = this.store.getConfig('wechat_baseUrl')
    const cdnBaseUrl = this.store.getConfig('wechat_cdnBaseUrl')
    const botType = this.store.getConfig('wechat_botType')
    const consoleToWechat = this.store.getConfig('wechat_consoleToWechat')
    const config = this.wechatManager.getConfig()
    if (baseUrl) config.baseUrl = baseUrl
    if (cdnBaseUrl) config.cdnBaseUrl = cdnBaseUrl
    if (botType) config.botType = botType
    if (consoleToWechat) config.consoleToWechat = consoleToWechat === 'true'
    this.wechatManager.updateConfig(config)

    const token = this.store.getConfig('wechat_token')
    const userId = this.store.getConfig('wechat_userId')
    const accountId = this.store.getConfig('wechat_accountId')
    if (token && userId && accountId) {
      this.wechatManager.setLoginFromQr(token!, userId!, accountId!)
    } else {
      this.wechatManager.tryRestoreLogin()
    }
  }

  getWeChatConfig(): { baseUrl: string; cdnBaseUrl: string; botType: string; consoleToWechat: boolean; loginInfo: WeChatLoginInfo | null } {
    const c = this.wechatManager.getConfig()
    return { ...c, loginInfo: this.wechatManager.getLoginInfo() }
  }

  updateWeChatConfig(config: { baseUrl?: string; cdnBaseUrl?: string; botType?: string; consoleToWechat?: boolean }) {
    this.wechatManager.updateConfig(config)
    if (config.baseUrl !== undefined) this.store.setConfig('wechat_baseUrl', config.baseUrl)
    if (config.cdnBaseUrl !== undefined) this.store.setConfig('wechat_cdnBaseUrl', config.cdnBaseUrl)
    if (config.botType !== undefined) this.store.setConfig('wechat_botType', config.botType)
    if (config.consoleToWechat !== undefined) this.store.setConfig('wechat_consoleToWechat', String(config.consoleToWechat))
  }

  async startWeChatMonitor(): Promise<void> {
    await this.wechatManager.startMonitor()
  }

  logoutWeChat(): void {
    this.wechatManager.logout()
    this.store.setConfig('wechat_token', '')
    this.store.setConfig('wechat_userId', '')
    this.store.setConfig('wechat_accountId', '')
    this.store.setConfig('wechat_loginAt', '')
  }

  getStore(): Store {
    return this.store
  }

  /** 从持久化存储中加载配置（权限级别、预算、并行数） */
  private loadConfig() {
    const permission = this.store.getConfig('permissionLevel')
    if (permission) this.permissionLevel = permission as PermissionLevel

    const budget = this.store.getConfig('budgetLimit')
    if (budget) this.budgetLimit = parseFloat(budget)

    const parallel = this.store.getConfig('maxParallel')
    if (parallel) this.maxParallel = parseInt(parallel, 10)

    const webhooks = this.store.getConfig('webhooks')
    if (webhooks) {
      try {
        this.notifier.setWebhooks(JSON.parse(webhooks))
      } catch { /* ignore invalid webhooks config */ }
    }
  }

  /**
   * 启动编排器：
   * 1. 订阅 opencode 全局 SSE 事件流
   * 2. 启动健康监控心跳
   * 3. 从持久化加载任务和 Agent 状态到内存
   * 4. 恢复上次崩溃时未完成的任务
   */
  async start() {
    this.abortSignal = new AbortController()
    this.recovery.setAbortSignal(this.abortSignal.signal)

    subscribeGlobalEvents(this.client, this.eventHandlers, this.abortSignal.signal)
    this.healthMonitor.start()

    // 清除 sessionId 为空的脏数据，再从持久化加载到内存
    this.store.deleteNullSessionAgents()
    const storedTasks = this.store.getAllTasks()
    for (const t of storedTasks) {
      this.tasks.set(t.id, t)
    }
    const storedAgents = this.store.getAllAgents()
    for (const a of storedAgents) {
      this.agents.set(a.sessionId, a)
      this.healthMonitor.registerSession(a.sessionId, a)
    }

    // 启动时恢复未完成任务（pending / running / failed 状态的任务）
    await this.recovery.recoverStartupTasks(async (taskId) => this.dispatchTask(taskId))

    // 如果已有 WeChat 登录态，启动长轮询监听
    if (this.wechatManager.isLoggedIn()) {
      this.wechatManager.startMonitor()
      logger.info('startup', 'WeChat monitor started from saved login')
    }

    this.addTimeline('system', 'system', 'start', 'Orchestrator started')
    logger.info('startup', 'Orchestrator started')
  }

  /** 停止编排器：释放所有定时器、关闭 SSE、中止所有 cron 作业 */
  stop() {
    this.abortSignal?.abort()
    this.healthMonitor.stop()
    this.scheduler.stopAllCronJobs()
    this.recovery.stop()
    this.addTimeline('system', 'system', 'stop', 'Orchestrator stopped')
    logger.info('shutdown', 'Orchestrator stopped')
  }

  getState() {
    return {
      tasks: Array.from(this.tasks.values()),
      agents: Array.from(this.agents.values()),
      timeline: this.timeline,
      budget: { spent: this.budgetSpent, limit: this.budgetLimit },
    }
  }

  setPermissionLevel(level: PermissionLevel) {
    this.permissionLevel = level
    this.store.setConfig('permissionLevel', level)
  }

  setBudgetLimit(limit: number) {
    this.budgetLimit = limit
    this.store.setConfig('budgetLimit', String(limit))
  }

  resetBudget() {
    this.budgetSpent = 0
    this.store.setConfig('budgetSpent', '0')
    this.callbacks.onStateChange()
  }

  setMaxParallel(count: number) {
    this.maxParallel = count
    this.scheduler.setMaxParallel(count)
    this.store.setConfig('maxParallel', String(count))
  }

  getProjectConfig(): { directory: string; goal: string; description: string } {
    return this.store.getProjectConfig()
  }

  setProjectConfig(config: { directory: string; goal: string; description: string }): void {
    this.store.setProjectConfig(config)
    this.addTimeline('system', 'system', 'config-update', 'Project configuration updated')
    this.callbacks.onStateChange()
  }

  async optimizeText(field: string, text: string): Promise<string> {
    // 直接调用 LLM API，不经过 ACP session
    let apiKey = process.env['DEEPSEEK_API_KEY'] || ''
    if (!apiKey) {
      try {
        const authPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json')
        if (fs.existsSync(authPath)) {
          const auth = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, { key?: string }>
          apiKey = auth['deepseek']?.key || ''
        }
      } catch { /* ignore */ }
    }
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured')

    const promptText = `请优化以下项目${field === 'goal' ? '目标' : '描述'}文本，使其更清晰、专业、简洁。直接返回优化后的内容，不要加任何解释。\n\n${text}`
    const label = field === 'goal' ? '目标' : '描述'

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: promptText },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`LLM API error (${res.status}): ${errBody}`)
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const result = data?.choices?.[0]?.message?.content?.trim()
    if (!result) throw new Error('LLM returned empty response')
    logger.info('eval', `Text optimized: ${label}`, { before: text.length, after: result.length })
    return result
  }

  /** 添加新任务到队列：生成唯一 ID、注册 DAG、入调度队列 */
  addTask(description: string, dependsOn: string[] = []) {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()

    // 提交前先做 DAG 循环依赖检测，避免死锁
    this.scheduler.validateDag(id, dependsOn)

    const task: TaskState = {
      id, description, status: 'pending', dependsOn,
      retryCount: 0, maxRetries: 10, createdAt: now, updatedAt: now,
      priority: 0, permission: this.permissionLevel, budget: this.budgetLimit,
    }
    this.tasks.set(id, task)
    this.store.insertTask(task)
    this.scheduler.registerTask(task)
    this.scheduler.enqueue(id)
    logger.info('task-create', `Task: ${description}`, { taskId: id, dependsOn })
    this.addTimeline('system', 'system', 'task-add', `Task added: ${description}`)
    this.callbacks.onStateChange()
    return id
  }

  /**
   * 分发任务：通过 ACP 创建子 Agent 会话并发送 prompt。
   * 包含预算检查、会话创建、Agent 状态注册、prompt 组装与发送。
   */
  async dispatchTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)

    if (this.budgetSpent >= this.budgetLimit) {
      this.addTimeline('system', 'system', 'budget-limit',
        `Budget limit reached: ${this.budgetSpent}/${this.budgetLimit}`)
      return
    }

    task.status = 'running'
    task.updatedAt = Date.now()
    this.store.updateTask(task)

    // 使用环境变量 ACP_MODEL 指定模型，格式 "providerID/modelID"
    // 默认为 deepseek/deepseek-chat（需先配置 DeepSeek API key）
    const envModel = process.env['ACP_MODEL'] || process.env['OPENCODE_MODEL']
    const model = envModel?.includes('/')
      ? { providerID: envModel.split('/')[0]!, modelID: envModel.split('/')[1]! }
      : { providerID: 'deepseek' as const, modelID: 'deepseek-chat' }

    let sessionData: { id: string }
    try {
      sessionData = await createSubAgentSession(
        this.client,
        taskId,
        model,
        this.permissionLevel,
      )
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'ACP session creation failed'
      logger.error('task-fail', errMsg, { taskId, model })
      task.status = 'failed'
      task.error = errMsg
      this.store.updateTask(task)
      this.scheduler.updateTaskStatus(taskId, 'failed')
      this.scheduler.onSessionEnded()
      this.addTimeline('system', 'system', 'max-retries', `Session creation failed: ${task.description}`)
      this.callbacks.onStateChange()
      return
    }

    const sessionId = sessionData.id
    task.sessionId = sessionId

    const now = Date.now()
    const agentState: AgentState = {
      sessionId,
      taskId,
      status: 'creating',
      stream: [],
      startTime: now,
      lastHeartbeat: now,
      watchdogTimeout: 120000,
      healthStatus: 'healthy',
    }
    this.agents.set(sessionId, agentState)
    this.store.insertAgent(agentState)
    this.healthMonitor.registerSession(sessionId, agentState)

    this.callbacks.onStateChange()
    this.addTimeline('main', sessionId, 'dispatch', `Dispatching: ${task.description}`)

    const feedbackContext = task.reviewHistory && task.reviewHistory.length > 0
      ? `\n\n## 前次执行反馈\n${task.reviewHistory.filter(r => r.action === 'rejected').map(r => r.feedback).filter(Boolean).join('\n')}`
      : ''

    const promptText = `You are a code development sub-agent.

## Task
${task.description}
${feedbackContext}
## Instructions
1. Read the OpenSpec documents to understand the design
2. Look at the existing code to understand the architecture
3. Implement the required changes
4. Run tests to verify
5. Update tasks.md to mark your task as complete
6. Return a summary of what was done`

    logger.info('task-dispatch', `Dispatched: ${task.description}`, { taskId, sessionId, model: task.permission })
    await sendTaskPrompt(this.client, sessionId, promptText)
    agentState.status = 'running'
    this.store.updateAgent(agentState)
    this.callbacks.onAgentStateChange(sessionId, { status: 'running' })
    this.callbacks.onStateChange()
  }

  /** 会话 idle 后的完成处理：拉取评估结果、计算费用、触发审核或完成 */
  private async handleSessionComplete(sessionId: string) {
    try {
      const agent = this.agents.get(sessionId)
      if (!agent) return

      const task = this.tasks.get(agent.taskId)
      if (!task) return

      const result = await evaluateTaskCompletion(this.client, sessionId)

      task.updatedAt = Date.now()
      this.budgetSpent += result.cost
      task.result = result

      // 日志记录完整的流式输出内容（生产模式保留摘要）
      const fullStream = agent.stream.join('')
      if (fullStream) {
        logger.info('stream', `Session output (${fullStream.length} chars)`,
          { sessionId, taskId: agent.taskId, preview: fullStream.slice(0, 500) })
      }

      if (task.permission === 'strict') {
        task.status = 'awaiting_review'
        this.store.updateTask(task)
        agent.status = 'idle'
        this.store.updateAgent(agent)

        this.addTimeline('sub', sessionId, 'awaiting-review',
          `Task awaiting review: ${task.description} (cost: ¥${result.cost.toFixed(4)})`)
        this.notifier.notify('task.awaiting_review', { id: task.id, description: task.description, status: 'awaiting_review', result: { summary: result.summary, cost: result.cost } })
      } else {
        task.status = 'completed'
        this.store.updateTask(task)
        agent.status = 'completed'
        agent.healthStatus = 'healthy'
        this.store.updateAgent(agent)
        this.healthMonitor.unregisterSession(sessionId)
        this.scheduler.updateTaskStatus(agent.taskId, 'completed')
        this.scheduler.onTaskCompleted(agent.taskId)
        this.scheduler.onSessionEnded()

        logger.info('task-complete', `Task completed: ${task.description}`,
          { taskId: agent.taskId, cost: result.cost, artifacts: result.artifacts })
        this.addTimeline('sub', sessionId, 'complete',
          `Task completed: ${task.description} (cost: ¥${result.cost.toFixed(4)})`)
        this.notifier.notify('task.completed', { id: task.id, description: task.description, status: 'completed', result: { summary: result.summary, cost: result.cost } })

        await this.wechatManager.finalizeStream(sessionId)

        if (this.wechatManager.isLoggedIn() && this.wechatManager.getConfig().consoleToWechat) {
          const targetUserId = this.wechatManager.getFirstContactUserId() || this.wechatManager.getLoginInfo()!.userId
          const summary = result.summary || task.description
          const chatMsg = [
            `✅ **任务完成: ${task.description}**`,
            `费用: ¥${result.cost.toFixed(4)}`,
            summary.length > 500 ? summary.slice(0, 500) + '...' : summary,
          ].join('\n\n')
          this.wechatManager.sendToUser(targetUserId, chatMsg)
        }
      }

      this.callbacks.onStateChange()
    } catch (err) {
      logger.error('eval', 'Evaluation error', { sessionId, error: err instanceof Error ? err.message : String(err) })
      this.addTimeline('system', sessionId, 'eval-error',
        `Evaluation error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * 会话错误处理：标记失败并尝试重试。
   * 达到最大重试次数后标记为最终失败，否则自动重新分发。
   */
  private async handleSessionError(sessionId: string, _error: unknown) {
    const agent = this.agents.get(sessionId)
    if (!agent) return

    const task = this.tasks.get(agent.taskId)
    if (!task) return

    task.retryCount++
    task.updatedAt = Date.now()
    this.healthMonitor.unregisterSession(sessionId)

    if (task.retryCount >= task.maxRetries) {
      task.status = 'failed'
      task.error = `Max retries (${task.maxRetries}) exceeded`
      this.store.updateTask(task)
      agent.status = 'failed'
      agent.healthStatus = 'dead'
      this.store.updateAgent(agent)
      this.scheduler.updateTaskStatus(agent.taskId, 'failed')
      this.scheduler.onSessionEnded()

      logger.error('task-fail', `Task failed after max retries: ${task.description}`,
        { taskId: agent.taskId, retries: task.retryCount })
      this.addTimeline('system', sessionId, 'max-retries',
        `Task failed: ${task.description} - max retries exceeded`)
      this.notifier.notify('task.failed', { id: task.id, description: task.description, status: 'failed', error: task.error })
    } else {
      this.store.updateTask(task)
      agent.status = 'error'
      agent.healthStatus = 'dead'
      this.store.updateAgent(agent)
      this.scheduler.onSessionEnded()

      logger.warn('task-retry', `Retrying task: ${task.description} (${task.retryCount}/${task.maxRetries})`,
        { taskId: agent.taskId, retryCount: task.retryCount })
      this.addTimeline('system', sessionId, 'retry',
        `Retrying task: ${task.description} (attempt ${task.retryCount}/${task.maxRetries})`)
      await this.dispatchTask(task.id)
    }
    this.callbacks.onStateChange()
  }

  /**
   * 处理 HealthMonitor 检测到的挂起会话。
   * 先尝试中止旧会话，再重新分发任务。超出重试次数则标记失败。
   */
  private async handleHungSession(sessionId: string) {
    const agent = this.agents.get(sessionId)
    if (!agent) return

    const task = this.tasks.get(agent.taskId)
    if (!task) return

    const shouldRecover = await this.recovery.recoverHungSession(
      sessionId, agent.taskId, task.retryCount, task.maxRetries,
    )

    if (shouldRecover) {
      task.retryCount++
      task.updatedAt = Date.now()
      this.store.updateTask(task)
      agent.status = 'recovering'
      this.store.updateAgent(agent)
      this.healthMonitor.unregisterSession(sessionId)
      this.scheduler.onSessionEnded()

      logger.warn('hung', `Session hung, recovering: ${task.description}`,
        { sessionId, taskId: agent.taskId, retryCount: task.retryCount })
      this.addTimeline('system', sessionId, 'hung-recovery',
        `Session hung, retrying (${task.retryCount}/${task.maxRetries})`)
      await this.dispatchTask(task.id)
    } else {
      task.status = 'failed'
      task.error = 'Session hung, max retries exceeded'
      task.updatedAt = Date.now()
      this.store.updateTask(task)
      agent.status = 'failed'
      agent.healthStatus = 'dead'
      this.store.updateAgent(agent)
      this.healthMonitor.unregisterSession(sessionId)
      this.scheduler.onSessionEnded()

      logger.error('hung', `Session hung, max retries exceeded: ${task.description}`,
        { sessionId, taskId: agent.taskId })
      this.addTimeline('system', sessionId, 'hung-failed',
        `Task failed: ${task.description} - session hung, max retries exceeded`)
    }
    this.callbacks.onStateChange()
  }

  /** 删除任务及其关联的 Agent 会话 */
  deleteTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (task.sessionId) {
      const agent = this.agents.get(task.sessionId)
      if (agent) {
        this.agents.delete(task.sessionId)
        this.healthMonitor.unregisterSession(task.sessionId)
        this.store.deleteAgent(task.sessionId)
      }
    }

    this.tasks.delete(taskId)
    this.store.deleteTask(taskId)
    this.scheduler.onSessionEnded()
    this.addTimeline('user', 'system', 'task-delete', `Task deleted: ${task.description}`)
    this.callbacks.onStateChange()
  }

  /** 中止运行中的任务：先 ACP abort 会话，再将任务状态回退到 pending */
  async abortTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (task.sessionId) {
      try {
        await abortSession(this.client, task.sessionId)
      } catch {
        // 会话可能已经过期，忽略错误
      }
      const abortedAgent = this.agents.get(task.sessionId)
      if (abortedAgent) {
        abortedAgent.status = 'aborted'
        this.store.updateAgent(abortedAgent)
      }
      this.healthMonitor.unregisterSession(task.sessionId)
    }

    task.status = 'pending'
    task.sessionId = undefined
    task.updatedAt = Date.now()
    this.store.updateTask(task)

    this.scheduler.onSessionEnded()

    logger.info('task-abort', `Task aborted: ${task.description}`, { taskId })
    this.addTimeline('user', 'system', 'abort', `Aborted: ${task.description}`)
    this.callbacks.onStateChange()
  }

  private addTimeline(source: TimelineEntry['source'], sessionId: string, type: string, message: string) {
    const entry: TimelineEntry = {
      id: crypto.randomUUID(),
      time: Date.now(),
      source,
      sessionId: sessionId !== 'system' ? sessionId : undefined,
      type,
      message,
    }
    this.timeline.push(entry)
    this.store.insertTimelineEntry(entry)
    this.callbacks.onTimeline(entry)
  }

  // ── Schedule management ──

  /** 添加 cron 定时任务 */
  addSchedule(description: string, cronExpr: string, permission: PermissionLevel = 'safe', budget = 0, maxRetries = 10): string {
    logger.info('schedule', `Schedule created: ${description}`, { cronExpr })
    const id = `schedule-${Date.now()}`
    const schedule: ScheduledTask = {
      id, description, cronExpr, permission, budget, maxRetries, enabled: true, lastTriggered: 0,
    }
    this.store.insertSchedule(schedule)
    this.scheduler.registerCronJob(schedule)
    return id
  }

  getSchedules(): ScheduledTask[] {
    return this.store.getAllSchedules()
  }

  /** 更新定时任务配置 */
  updateSchedule(id: string, updates: Partial<ScheduledTask>): void {
    const schedules = this.store.getAllSchedules()
    const existing = schedules.find((s) => s.id === id)
    if (!existing) throw new Error(`Schedule ${id} not found`)

    const updated = { ...existing, ...updates }
    this.store.updateSchedule(updated)
    this.scheduler.unregisterCronJob(id)
    if (updated.enabled) this.scheduler.registerCronJob(updated)
  }

  /** 删除定时任务 */
  deleteSchedule(id: string): void {
    this.scheduler.unregisterCronJob(id)
    this.store.deleteSchedule(id)
  }

  // ── Continue prompt ──

  /** 向已完成/空闲的会话发送后续 prompt（人工跟进） */
  async continuePrompt(sessionId: string, promptText: string): Promise<void> {
    const agent = this.agents.get(sessionId)
    if (!agent) throw new Error(`Session ${sessionId} not found`)

    await sendTaskPrompt(this.client, sessionId, promptText)
    this.addTimeline('user', sessionId, 'follow-up', `Follow-up: ${promptText}`)
    this.callbacks.onStateChange()
  }

  // ── Review queries ──

  getTasksAwaitingReview(): TaskState[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'awaiting_review')
  }

  getReviewHistory(taskId: string): ReviewRecord[] {
    return this.store.getReviewsByTaskId(taskId)
  }

  // ── Human Review ──

  /** 人工审核通过：将任务标记为 completed，触发后续依赖任务 */
  async approveTask(taskId: string, feedback?: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    if (task.status !== 'awaiting_review') throw new Error(`Task ${taskId} is not awaiting review`)
    logger.info('review', `Task approved: ${task.description}`, { taskId, feedback })

    task.status = 'completed'
    task.updatedAt = Date.now()

    if (!task.reviewHistory) task.reviewHistory = []
    task.reviewHistory.push({
      taskId, action: 'approved', feedback, reviewer: 'user', reviewedAt: Date.now(),
    })

    this.store.updateTask(task)
    this.store.insertReview({
      taskId, action: 'approved', feedback, reviewer: 'user', reviewedAt: Date.now(),
    })

    if (task.sessionId) {
      const agent = this.agents.get(task.sessionId)
      if (agent) {
        agent.status = 'completed'
        agent.healthStatus = 'healthy'
        this.store.updateAgent(agent)
        this.healthMonitor.unregisterSession(task.sessionId)
      }
    }

    this.scheduler.updateTaskStatus(taskId, 'completed')
    this.scheduler.onTaskCompleted(taskId)
    this.scheduler.onSessionEnded()

    this.addTimeline('user', task.sessionId || 'system', 'review-approved',
      `Review approved: ${task.description}${feedback ? ` (feedback: ${feedback})` : ''}`)
    this.notifier.notify('task.review_approved', { id: task.id, description: task.description, status: 'completed' })
    this.callbacks.onStateChange()
  }

  /** 人工审核驳回：记录反馈，任务状态改为 rejected，可选择重新分发 */
  async rejectTask(taskId: string, feedback: string): Promise<void> {
    if (!feedback) throw new Error('Feedback is required when rejecting a task')

    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    if (task.status !== 'awaiting_review') throw new Error(`Task ${taskId} is not awaiting review`)
    logger.info('review', `Task rejected: ${task.description}`, { taskId, feedback })

    task.status = 'rejected'
    task.updatedAt = Date.now()

    if (!task.reviewHistory) task.reviewHistory = []
    task.reviewHistory.push({
      taskId, action: 'rejected', feedback, reviewer: 'user', reviewedAt: Date.now(),
    })

    this.store.updateTask(task)
    this.store.insertReview({
      taskId, action: 'rejected', feedback, reviewer: 'user', reviewedAt: Date.now(),
    })

    if (task.sessionId) {
      const agent = this.agents.get(task.sessionId)
      if (agent) {
        agent.status = 'completed'
        this.store.updateAgent(agent)
        this.healthMonitor.unregisterSession(task.sessionId)
      }
    }

    this.scheduler.onSessionEnded()

    this.addTimeline('user', task.sessionId || 'system', 'review-rejected',
      `Review rejected: ${task.description} (feedback: ${feedback})`)
    this.notifier.notify('task.review_rejected', { id: task.id, description: task.description, status: 'rejected', error: feedback })
    this.callbacks.onStateChange()
  }
}
