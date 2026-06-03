import { execSync } from 'node:child_process'
import type { FastifyInstance } from 'fastify'
import type { Orchestrator } from '../orchestrator/core.js'
import type { PermissionLevel } from '../orchestrator/types.js'
import type { WebhookConfig } from './notifier.js'
import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()

/**
 * 注册所有 REST API 路由。
 * 路由设计遵循 RESTful 风格，所有路径以 /api/ 开头。
 */
export function registerApiRoutes(app: FastifyInstance, orchestrator: Orchestrator) {
  app.get('/api/state', async () => {
    return orchestrator.getState()
  })

  app.post<{ Body: { description: string; dependsOn?: string[]; priority?: number } }>(
    '/api/task',
    async (request, reply) => {
      const { description, dependsOn } = request.body
      if (!description) {
        return reply.status(400).send({ error: 'description is required' })
      }
      const taskId = orchestrator.addTask(description, dependsOn)
      return { taskId }
    },
  )

  app.post<{ Params: { taskId: string } }>(
    '/api/task/:taskId/dispatch',
    async (request, reply) => {
      try {
        await orchestrator.dispatchTask(request.params.taskId)
        return { success: true }
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
  )

  app.post<{ Params: { taskId: string } }>(
    '/api/task/:taskId/abort',
    async (request) => {
      await orchestrator.abortTask(request.params.taskId)
      return { success: true }
    },
  )

  app.delete<{ Params: { taskId: string } }>(
    '/api/task/:taskId',
    async (request) => {
      orchestrator.deleteTask(request.params.taskId)
      return { success: true }
    },
  )

  app.post<{ Body: { level: string } }>(
    '/api/config/permission',
    async (request) => {
      const { level } = request.body
      if (!['trusted', 'safe', 'strict'].includes(level)) {
        return { error: 'invalid level' }
      }
      orchestrator.setPermissionLevel(level as PermissionLevel)
      return { success: true }
    },
  )

  app.post<{ Body: { limit: number } }>(
    '/api/config/budget',
    async (request) => {
      const { limit } = request.body
      orchestrator.setBudgetLimit(limit)
      return { success: true }
    },
  )

  app.post<{ Body: { count: number } }>(
    '/api/config/parallel',
    async (request) => {
      const { count } = request.body
      orchestrator.setMaxParallel(count)
      return { success: true }
    },
  )

  // ── Schedule CRUD ──

  app.post<{ Body: { description: string; cronExpr: string; permission?: PermissionLevel; budget?: number; maxRetries?: number } }>(
    '/api/schedule',
    async (request, reply) => {
      const { description, cronExpr, permission, budget, maxRetries } = request.body
      if (!description || !cronExpr) {
        return reply.status(400).send({ error: 'description and cronExpr are required' })
      }
      try {
        const id = orchestrator.addSchedule(description, cronExpr, permission, budget, maxRetries)
        return { id }
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
  )

  app.get('/api/schedule', async () => {
    return orchestrator.getSchedules()
  })

  app.put<{ Params: { id: string }; Body: { description?: string; cronExpr?: string; permission?: PermissionLevel; budget?: number; maxRetries?: number; enabled?: boolean } }>(
    '/api/schedule/:id',
    async (request, reply) => {
      try {
        orchestrator.updateSchedule(request.params.id, request.body)
        return { success: true }
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/api/schedule/:id',
    async (request, reply) => {
      try {
        orchestrator.deleteSchedule(request.params.id)
        return { success: true }
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
  )

  // ── Human Review ──

  app.post<{ Params: { taskId: string }; Body: { feedback?: string } }>(
    '/api/task/:taskId/approve',
    async (request, reply) => {
      try {
        await orchestrator.approveTask(request.params.taskId, request.body?.feedback)
        return { success: true }
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: err.message })
        }
        return reply.status(409).send({
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
  )

  app.post<{ Params: { taskId: string }; Body: { feedback: string } }>(
    '/api/task/:taskId/reject',
    async (request, reply) => {
      try {
        const { feedback } = request.body
        if (!feedback) {
          return reply.status(400).send({ error: 'feedback is required' })
        }
        await orchestrator.rejectTask(request.params.taskId, feedback)
        return { success: true }
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: err.message })
        }
        return reply.status(409).send({
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
  )

  app.get('/api/tasks/awaiting-review', async () => {
    return orchestrator.getTasksAwaitingReview()
  })

  app.get<{ Params: { taskId: string } }>(
    '/api/task/:taskId/review-history',
    async (request) => {
      return orchestrator.getReviewHistory(request.params.taskId)
    },
  )

  // ── Webhook Management ──

  app.get('/api/webhooks', async () => {
    return orchestrator.getWebhooks()
  })

  app.post<{ Body: WebhookConfig }>(
    '/api/webhooks',
    async (request, reply) => {
      const config = request.body
      if (!config.url) return reply.status(400).send({ error: 'url is required' })
      if (!config.events || config.events.length === 0) return reply.status(400).send({ error: 'events must be a non-empty array' })
      const current = orchestrator.getWebhooks()
      current.push({ ...config, enabled: config.enabled !== false })
      orchestrator.setWebhooks(current)
      return { success: true }
    },
  )

  app.delete<{ Querystring: { url: string } }>(
    '/api/webhooks',
    async (request, reply) => {
      const { url } = request.query
      if (!url) return reply.status(400).send({ error: 'url query param is required' })
      const current = orchestrator.getWebhooks().filter((w) => w.url !== url)
      orchestrator.setWebhooks(current)
      return { success: true }
    },
  )

  app.put<{ Querystring: { url: string }; Body: Partial<WebhookConfig> }>(
    '/api/webhooks',
    async (request, reply) => {
      const { url } = request.query
      if (!url) return reply.status(400).send({ error: 'url query param is required' })
      const current = orchestrator.getWebhooks()
      const idx = current.findIndex((w) => w.url === url)
      if (idx === -1) return reply.status(404).send({ error: 'webhook not found' })
      current[idx] = { ...current[idx], ...request.body }
      orchestrator.setWebhooks(current)
      return { success: true }
    },
  )

  // ── Project Config ──

  app.get('/api/project/config', async () => {
    return orchestrator.getProjectConfig()
  })

  app.put<{ Body: { directory?: string; goal?: string; description?: string } }>(
    '/api/project/config',
    async (request, reply) => {
      if (!request.body || typeof request.body !== 'object') {
        return reply.status(400).send({ error: 'Invalid request body' })
      }
      const { directory, goal, description } = request.body
      if (directory !== undefined && typeof directory !== 'string') {
        return reply.status(400).send({ error: 'directory must be a string' })
      }
      if (goal !== undefined && typeof goal !== 'string') {
        return reply.status(400).send({ error: 'goal must be a string' })
      }
      if (description !== undefined && typeof description !== 'string') {
        return reply.status(400).send({ error: 'description must be a string' })
      }
      orchestrator.setProjectConfig({ directory: directory || '', goal: goal || '', description: description || '' })
      return { success: true }
    },
  )

  app.post<{ Body: { field: string; text: string } }>(
    '/api/project/optimize',
    async (request, reply) => {
      const { field, text } = request.body
      if (!field || !text) {
        return reply.status(400).send({ error: 'field and text are required' })
      }
      try {
        const optimized = await orchestrator.optimizeText(field, text)
        return { text: optimized }
      } catch (err) {
        return reply.status(500).send({ error: err instanceof Error ? err.message : 'Optimization failed' })
      }
    },
  )

  // ── WeChat Config ──

  app.get('/api/wechat/config', async () => {
    return orchestrator.getWeChatConfig()
  })

  app.put<{ Body: { baseUrl?: string; cdnBaseUrl?: string; botType?: string; consoleToWechat?: boolean } }>(
    '/api/wechat/config',
    async (request, reply) => {
      if (!request.body || typeof request.body !== 'object') {
        return reply.status(400).send({ error: 'Invalid request body' })
      }
      orchestrator.updateWeChatConfig(request.body)
      return { success: true }
    },
  )

  app.post('/api/wechat/qrcode', async (request, reply) => {
    try {
      const wm = orchestrator.getWeChatManager()
      const result = await wm.getQrCode()
      return result
    } catch (err) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : 'Get QR code failed' })
    }
  })

  app.get<{ Querystring: { qrcode: string } }>(
    '/api/wechat/qrcode/status',
    async (request, reply) => {
      const { qrcode } = request.query
      if (!qrcode) return reply.status(400).send({ error: 'qrcode query param is required' })
      try {
        const wm = orchestrator.getWeChatManager()
        const result = await wm.checkQrStatus(qrcode)
        return result
      } catch (err) {
        return reply.status(500).send({ error: err instanceof Error ? err.message : 'Check status failed' })
      }
    },
  )

  app.post('/api/wechat/logout', async () => {
    orchestrator.logoutWeChat()
    return { success: true }
  })

  app.get('/api/wechat/login/status', async () => {
    const wm = orchestrator.getWeChatManager()
    return {
      loggedIn: wm.isLoggedIn(),
      loginInfo: wm.getLoginInfo(),
    }
  })

  app.post<{ Body: { text: string } }>(
    '/api/wechat/test',
    async (request, reply) => {
      const { text } = request.body
      if (!text) return reply.status(400).send({ error: 'text is required' })
      const wm = orchestrator.getWeChatManager()
      if (!wm.isLoggedIn()) return reply.status(400).send({ error: 'Not logged in to WeChat' })
      const targetUserId = wm.getFirstContactUserId() || wm.getLoginInfo()!.userId
      try {
        await wm.sendToUser(targetUserId, `[Test] ${text}`)
        return { success: true, targetUserId }
      } catch (err) {
        return reply.status(500).send({ error: err instanceof Error ? err.message : 'Send failed' })
      }
    },
  )

  // ── Comet Engine ──

  app.get('/api/comet/status', async () => {
    const engine = (orchestrator as any).cometEngine
    if (!engine) return { engineAvailable: false }
    const state = engine.getCurrentState()
    return { engineAvailable: true, state }
  })

  app.post('/api/plugins/update', async () => {
    const results: { command: string; success: boolean; error?: string }[] = []
    for (const cmd of ['git pull', 'npx openspec update']) {
      try {
        execSync(cmd, { cwd: process.cwd(), timeout: 30000, stdio: 'pipe' })
        results.push({ command: cmd, success: true })
      } catch (err) {
        results.push({ command: cmd, success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
    return { success: results.every(r => r.success), results }
  })
}
