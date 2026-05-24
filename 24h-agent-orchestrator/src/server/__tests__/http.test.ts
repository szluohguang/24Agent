import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHttpServer } from '../http.js'
import type { Orchestrator } from '../../orchestrator/core.js'
import type { OrchestratorCallbacks } from '../../orchestrator/core.js'

function createMockOrchestrator(): Orchestrator {
  const callbacks: OrchestratorCallbacks = {
    onStateChange: () => {},
    onTimeline: () => {},
    onStreamDelta: () => {},
    onAgentStateChange: () => {},
  }
  return {
    getState: () => ({
      tasks: [],
      agents: [],
      timeline: [],
      budget: { spent: 0, limit: 50 },
    }),
    addTask: () => 'mock-task-id',
    dispatchTask: async () => {},
    abortTask: async () => {},
    setPermissionLevel: () => {},
    setBudgetLimit: () => {},
    setMaxParallel: () => {},
    start: async () => {},
    stop: () => {},
  } as unknown as Orchestrator
}

describe('HTTP Server', () => {
  const app = createHttpServer(createMockOrchestrator())

  beforeAll(async () => {
    await app
  })

  afterAll(async () => {
    ;(await app).close()
  })

  it('GET / returns 200 with index.html', async () => {
    const res = await (await app).inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
  })

  it('GET /health returns ok status', async () => {
    const res = await (await app).inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('GET /api/state returns orchestrator state', async () => {
    const res = await (await app).inject({ method: 'GET', url: '/api/state' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('tasks')
    expect(res.json()).toHaveProperty('agents')
    expect(res.json()).toHaveProperty('timeline')
  })

  it('unknown routes fallback to index.html for SPA', async () => {
    const res = await (await app).inject({ method: 'GET', url: '/some/unknown/path' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
  })
})
