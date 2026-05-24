import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createHttpServer } from '../http.js'
import type { Orchestrator, OrchestratorCallbacks } from '../../orchestrator/core.js'

function createMockOrchestrator(): Orchestrator {
  const callbacks: OrchestratorCallbacks = {
    onStateChange: () => {},
    onTimeline: () => {},
    onStreamDelta: () => {},
    onAgentStateChange: () => {},
  }
  let tasks: Array<{ id: string; description: string; status: string }> = []
  let permissionLevel = 'safe'

  return {
    getState: () => ({
      tasks: [...tasks],
      agents: [],
      timeline: [],
      budget: { spent: 0, limit: 50 },
    }),
    addTask: vi.fn((description: string) => {
      const id = `task-${Date.now()}`
      tasks.push({ id, description, status: 'pending' })
      return id
    }) as unknown as Orchestrator['addTask'],
    dispatchTask: vi.fn(async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId)
      if (!task) throw new Error(`Task ${taskId} not found`)
      task.status = 'running'
    }) as unknown as Orchestrator['dispatchTask'],
    abortTask: vi.fn(async () => {}) as unknown as Orchestrator['abortTask'],
    setPermissionLevel: vi.fn((level: string) => { permissionLevel = level }) as unknown as Orchestrator['setPermissionLevel'],
    setBudgetLimit: vi.fn() as unknown as Orchestrator['setBudgetLimit'],
    setMaxParallel: vi.fn() as unknown as Orchestrator['setMaxParallel'],
    start: async () => {},
    stop: () => {},
  } as unknown as Orchestrator
}

describe('HTTP Server', () => {
  const mockOrch = createMockOrchestrator()
  let app: Awaited<ReturnType<typeof createHttpServer>>

  beforeAll(async () => {
    app = await createHttpServer(mockOrch)
  })

  afterAll(async () => {
    app.close()
  })

  describe('GET endpoints', () => {
    it('GET / returns 200 with index.html', async () => {
      const res = await app.inject({ method: 'GET', url: '/' })
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toContain('text/html')
    })

    it('GET /health returns ok status', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ status: 'ok' })
    })

    it('GET /api/state returns orchestrator state', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/state' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty('tasks')
      expect(res.json()).toHaveProperty('agents')
      expect(res.json()).toHaveProperty('timeline')
    })

    it('unknown routes fallback to index.html for SPA', async () => {
      const res = await app.inject({ method: 'GET', url: '/some/unknown/path' })
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toContain('text/html')
    })
  })

  describe('POST /api/task', () => {
    it('should create a task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/task',
        payload: { description: 'Test task' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty('taskId')
    })

    it('should reject task without description', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/task',
        payload: {},
      })
      expect(res.statusCode).toBe(400)
      expect(res.json()).toHaveProperty('error')
    })
  })

  describe('POST /api/task/:taskId/dispatch', () => {
    it('should dispatch an existing task', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/task',
        payload: { description: 'Dispatchable task' },
      })
      const { taskId } = createRes.json()

      const res = await app.inject({
        method: 'POST',
        url: `/api/task/${taskId}/dispatch`,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ success: true })
    })

    it('should return 400 for non-existent task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/task/nonexistent/dispatch',
      })
      expect(res.statusCode).toBe(400)
      expect(res.json()).toHaveProperty('error')
    })
  })

  describe('POST /api/task/:taskId/abort', () => {
    it('should abort an existing task', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/task',
        payload: { description: 'Abortable task' },
      })
      const { taskId } = createRes.json()

      const res = await app.inject({
        method: 'POST',
        url: `/api/task/${taskId}/abort`,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ success: true })
    })
  })

  describe('POST /api/config endpoints', () => {
    it('should set permission level', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config/permission',
        payload: { level: 'strict' },
      })
      expect(res.statusCode).toBe(200)
    })

    it('should set budget limit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config/budget',
        payload: { limit: 100 },
      })
      expect(res.statusCode).toBe(200)
    })

    it('should set max parallel', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config/parallel',
        payload: { count: 5 },
      })
      expect(res.statusCode).toBe(200)
    })
  })
})
