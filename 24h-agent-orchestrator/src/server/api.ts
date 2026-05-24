import type { FastifyInstance } from 'fastify'
import type { Orchestrator } from '../orchestrator/core.js'

/** 注册 REST API 路由，提供状态查询和任务/配置管理 */
export function registerApiRoutes(app: FastifyInstance, orchestrator: Orchestrator) {
  app.get('/api/state', async () => {
    return orchestrator.getState()
  })

  app.post<{ Body: { description: string; dependsOn?: string[] } }>(
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

  app.post<{ Body: { level: string } }>(
    '/api/config/permission',
    async (request) => {
      const { level } = request.body
      if (!['trusted', 'safe', 'strict'].includes(level)) {
        return { error: 'invalid level' }
      }
      orchestrator.setPermissionLevel(level as 'trusted' | 'safe' | 'strict')
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
}
