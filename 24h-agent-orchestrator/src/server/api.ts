import type { FastifyInstance } from 'fastify'
import type { Orchestrator } from '../orchestrator/core.js'
import type { PermissionLevel } from '../orchestrator/types.js'

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
}
