import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Orchestrator } from '../core.js'
import { createMockClient, createMockCallbacks, createOrchestratorWithMockClient } from '../../test-utils/factories.js'

function createReviewTestSetup() {
  const ctx = createOrchestratorWithMockClient()
  ctx.orchestrator.setPermissionLevel('strict')

  const id = ctx.orchestrator.addTask('Review test task')
  ctx.mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-review-1' } })
  ctx.mockClient.mocks.sessionMessages.mockResolvedValue({
    data: {
      items: [
        { role: 'assistant', summary: { body: 'Review test done' }, cost: 0.005, tokens: { input: 200, output: 100 } },
      ],
    },
  })
  ctx.mockClient.mocks.sessionDiff.mockResolvedValue({
    data: [{ file: 'src/test.ts' }],
  })

  return { ...ctx, id }
}

describe('Orchestrator', () => {
  let orchestrator: Orchestrator
  let mockClient: ReturnType<typeof createMockClient>
  let callbacks: ReturnType<typeof createMockCallbacks>

  beforeEach(() => {
    const ctx = createOrchestratorWithMockClient()
    orchestrator = ctx.orchestrator
    mockClient = ctx.mockClient
    callbacks = ctx.callbacks
  })

  describe('addTask()', () => {
    it('should create a task and auto-dispatch', () => {
      const id = orchestrator.addTask('Test task')
      const state = orchestrator.getState()
      const task = state.tasks.find(t => t.id === id)
      expect(task).toBeDefined()
      expect(task!.description).toBe('Test task')
      expect(task!.dependsOn).toEqual([])
      expect(task!.retryCount).toBe(0)
      expect(callbacks.onStateChange).toHaveBeenCalled()
    })

    it('should create a task with dependencies', () => {
      const depId = orchestrator.addTask('Dependency')
      const id = orchestrator.addTask('Child task', [depId])
      const state = orchestrator.getState()
      const task = state.tasks.find(t => t.id === id)
      expect(task!.dependsOn).toEqual([depId])
    })

    it('should generate unique task IDs', () => {
      const id1 = orchestrator.addTask('Task 1')
      const id2 = orchestrator.addTask('Task 2')
      expect(id1).not.toBe(id2)
    })

    it('should add timeline entry on task creation', () => {
      orchestrator.addTask('New task')
      expect(callbacks.onTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'system',
          type: 'task-add',
          message: expect.stringContaining('New task'),
        }),
      )
    })
  })

  describe('dispatchTask()', () => {
    it('should throw for non-existent task', async () => {
      await expect(orchestrator.dispatchTask('nonexistent'))
        .rejects.toThrow('Task nonexistent not found')
    })

    it('should dispatch a task and create agent session', async () => {
      const id = orchestrator.addTask('Dispatch test')
      mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-abc-123' } })

      await orchestrator.dispatchTask(id)

      const state = orchestrator.getState()
      const task = state.tasks.find(t => t.id === id)
      expect(task!.status).toBe('running')
      expect(task!.sessionId).toBe('session-abc-123')

      expect(mockClient.mocks.sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Dispatch test' }),
      )
      expect(mockClient.mocks.sessionPrompt).toHaveBeenCalled()
      expect(callbacks.onStateChange).toHaveBeenCalled()
    })

    it('should not dispatch if budget is exceeded', async () => {
      orchestrator.setBudgetLimit(1)
      orchestrator['budgetSpent'] = 1

      const id = orchestrator.addTask('Budget exceeded task')
      await orchestrator.dispatchTask(id)

      const state = orchestrator.getState()
      const task = state.tasks.find(t => t.id === id)
      expect(task!.status).toBe('pending')
      expect(mockClient.mocks.sessionCreate).not.toHaveBeenCalled()
    })
  })

  describe('abortTask()', () => {
    it('should abort a running task', async () => {
      const id = orchestrator.addTask('Abort test')
      mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-abort-1' } })
      await orchestrator.dispatchTask(id)

      await orchestrator.abortTask(id)

      const state = orchestrator.getState()
      const task = state.tasks.find(t => t.id === id)
      expect(task!.status).toBe('pending')
      expect(mockClient.mocks.sessionAbort).toHaveBeenCalledWith(
        expect.objectContaining({ sessionID: 'session-abort-1' }),
      )
    })

    it('should silently ignore abort for non-existent task', async () => {
      await expect(orchestrator.abortTask('nonexistent')).resolves.toBeUndefined()
    })

    it('should silently ignore abort for task without session', async () => {
      const id = orchestrator.addTask('No session')
      await expect(orchestrator.abortTask(id)).resolves.toBeUndefined()
    })
  })

  describe('getState()', () => {
    it('should return empty state initially', () => {
      const state = orchestrator.getState()
      expect(state.tasks).toEqual([])
      expect(state.agents).toEqual([])
      expect(state.timeline).toBeDefined()
      expect(state.budget).toEqual({ spent: 0, limit: 50 })
    })

    it('should reflect added tasks in state', () => {
      orchestrator.addTask('Task A')
      orchestrator.addTask('Task B')
      const state = orchestrator.getState()
      // 每个根任务自动创建 5 个 phase 子任务，共 2 × 6 = 12
      expect(state.tasks.length).toBeGreaterThanOrEqual(2)
      // 至少包含两个根任务
      const rootTasks = state.tasks.filter((t: any) => !t.dependsOn || t.dependsOn.length === 0)
      expect(rootTasks).toHaveLength(2)
    })
  })

  describe('configuration', () => {
    it('should set permission level', () => {
      orchestrator.setPermissionLevel('strict')
      expect(orchestrator['permissionLevel']).toBe('strict')
    })

    it('should set budget limit', () => {
      orchestrator.setBudgetLimit(100)
      expect(orchestrator['budgetLimit']).toBe(100)
    })

    it('should set max parallel', () => {
      orchestrator.setMaxParallel(5)
      expect(orchestrator['maxParallel']).toBe(5)
    })
  })

  describe('session lifecycle', () => {
    it('should handle session idle by completing task', async () => {
      const id = orchestrator.addTask('Session lifecycle')
      mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-lifecycle-1' } })
      mockClient.mocks.sessionMessages.mockResolvedValue({
        data: {
          items: [
            { role: 'assistant', summary: { body: 'Task done' }, cost: 0.002, tokens: { input: 100, output: 50 } },
          ],
        },
      })

      await orchestrator.dispatchTask(id)

      const stateBefore = orchestrator.getState()
      const agent = stateBefore.agents[0]
      expect(agent.status).toBe('running')

      mockClient.mocks.sessionDiff.mockResolvedValue({ data: [{ file: 'src/foo.ts' }] })

      await orchestrator['handleSessionComplete'](agent.sessionId)

      const stateAfter = orchestrator.getState()
      const task = stateAfter.tasks.find(t => t.id === id)
      expect(task!.status).toBe('completed')
      expect(orchestrator['budgetSpent']).toBe(0.0002)
    })

    it('should retry on session error', async () => {
      const id = orchestrator.addTask('Retry test')
      mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-retry-1' } })
      await orchestrator.dispatchTask(id)

      const stateBefore = orchestrator.getState()
      const agent = stateBefore.agents[0]

      mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-retry-2' } })
      await orchestrator['handleSessionError'](agent.sessionId, new Error('test error'))

      expect(orchestrator['tasks'].get(id)!.retryCount).toBe(1)
      expect(orchestrator['tasks'].get(id)!.status).toBe('running')
    })

    it('should handle session idle with strict permission as awaiting_review', async () => {
      const ctx = createOrchestratorWithMockClient()
      ctx.orchestrator.setPermissionLevel('strict')
      const id = ctx.orchestrator.addTask('Strict review')
      ctx.mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-strict-1' } })
      await ctx.orchestrator.dispatchTask(id)

      ctx.mockClient.mocks.sessionMessages.mockResolvedValue({
        data: {
          items: [
            { role: 'assistant', summary: { body: 'Done' }, cost: 0.003, tokens: { input: 100, output: 50 } },
          ],
        },
      })
      ctx.mockClient.mocks.sessionDiff.mockResolvedValue({ data: [{ file: 'src/x.ts' }] })

      const state = ctx.orchestrator.getState()
      const agent = state.agents[0]
      await ctx.orchestrator['handleSessionComplete'](agent.sessionId)

      const task = ctx.orchestrator['tasks'].get(id)!
      expect(task.status).toBe('awaiting_review')
      expect(task.result).toBeDefined()
      expect(task.result!.summary).toBe('Done')
      expect(task.result!.cost).toBeCloseTo(0.0002, 6)
    })

    it('should mark task as completed for safe mode after session idle', async () => {
      const ctx = createOrchestratorWithMockClient()
      ctx.orchestrator.setPermissionLevel('safe')  // 非 strict
      const id = ctx.orchestrator.addTask('Safe review')
      ctx.mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-safe-1' } })
      await ctx.orchestrator.dispatchTask(id)

      ctx.mockClient.mocks.sessionMessages.mockResolvedValue({
        data: {
          items: [
            { role: 'assistant', summary: { body: 'Done safe' }, cost: 0.001, tokens: { input: 50, output: 25 } },
          ],
        },
      })
      ctx.mockClient.mocks.sessionDiff.mockResolvedValue({ data: [] })

      const state = ctx.orchestrator.getState()
      const agent = state.agents[0]
      await ctx.orchestrator['handleSessionComplete'](agent.sessionId)

      const task = ctx.orchestrator['tasks'].get(id)!
      expect(task.status).toBe('completed')
    })

    it('should mark task as failed after max retries', async () => {
      const id = orchestrator.addTask('Max retries')
      mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-retry-x' } })
      await orchestrator.dispatchTask(id)

      const task = orchestrator['tasks'].get(id)!
      task.retryCount = 9
      task.maxRetries = 10

      const agent = orchestrator['agents'].get('session-retry-x')!
      await orchestrator['handleSessionError'](agent.sessionId, new Error('final error'))

      expect(task.status).toBe('failed')
      expect(task.error).toContain('Max retries')
    })
  })

  describe('approveTask()', () => {
    it('should approve a task and mark it as completed', async () => {
      const ctx = createOrchestratorWithMockClient()
      ctx.orchestrator.setPermissionLevel('strict')
      const id = ctx.orchestrator.addTask('Approve test')
      ctx.mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-approve-1' } })
      await ctx.orchestrator.dispatchTask(id)

      ctx.mockClient.mocks.sessionMessages.mockResolvedValue({
        data: {
          items: [
            { role: 'assistant', summary: { body: 'Done' }, cost: 0.002, tokens: { input: 80, output: 40 } },
          ],
        },
      })
      ctx.mockClient.mocks.sessionDiff.mockResolvedValue({ data: [] })

      const state = ctx.orchestrator.getState()
      const agent = state.agents[0]
      await ctx.orchestrator['handleSessionComplete'](agent.sessionId)

      await ctx.orchestrator.approveTask(id)

      const task = ctx.orchestrator['tasks'].get(id)!
      expect(task.status).toBe('completed')
      expect(ctx.callbacks.onStateChange).toHaveBeenCalled()
    })

    it('should throw for non-existent task on approve', async () => {
      const ctx = createOrchestratorWithMockClient()
      await expect(ctx.orchestrator.approveTask('nonexistent'))
        .rejects.toThrow('Task nonexistent not found')
    })

    it('should throw if task is not awaiting_review', async () => {
      const ctx = createOrchestratorWithMockClient()
      const id = ctx.orchestrator.addTask('Not awaiting')
      await expect(ctx.orchestrator.approveTask(id))
        .rejects.toThrow('not awaiting review')
    })
  })

  describe('rejectTask()', () => {
    it('should reject a task with feedback', async () => {
      const ctx = createOrchestratorWithMockClient()
      ctx.orchestrator.setPermissionLevel('strict')
      const id = ctx.orchestrator.addTask('Reject test')
      ctx.mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-reject-1' } })
      await ctx.orchestrator.dispatchTask(id)

      ctx.mockClient.mocks.sessionMessages.mockResolvedValue({
        data: {
          items: [
            { role: 'assistant', summary: { body: 'Reject me' }, cost: 0.001, tokens: { input: 30, output: 15 } },
          ],
        },
      })
      ctx.mockClient.mocks.sessionDiff.mockResolvedValue({ data: [] })

      const state = ctx.orchestrator.getState()
      const agent = state.agents[0]
      await ctx.orchestrator['handleSessionComplete'](agent.sessionId)

      await ctx.orchestrator.rejectTask(id, 'Need better implementation')

      const task = ctx.orchestrator['tasks'].get(id)!
      expect(task.status).toBe('rejected')
      expect(task.reviewHistory).toHaveLength(1)
      expect(task.reviewHistory![0].action).toBe('rejected')
      expect(task.reviewHistory![0].feedback).toBe('Need better implementation')
    })

    it('should require feedback when rejecting', async () => {
      const ctx = createOrchestratorWithMockClient()
      const id = ctx.orchestrator.addTask('No feedback')
      // Manually set awaiting_review for test
      const task = ctx.orchestrator['tasks'].get(id)!
      task.status = 'awaiting_review'
      await expect(ctx.orchestrator.rejectTask(id, ''))
        .rejects.toThrow('Feedback is required')
    })
  })

  describe('rejected task re-dispatch', () => {
    it('should inject rejection feedback into prompt on re-dispatch', async () => {
      const ctx = createOrchestratorWithMockClient()
      ctx.orchestrator.setPermissionLevel('strict')
      const id = ctx.orchestrator.addTask('Redispatch test')

      // Set up task as rejected with feedback
      const task = ctx.orchestrator['tasks'].get(id)!
      task.status = 'rejected'
      task.reviewHistory = [{
        taskId: id, action: 'rejected', feedback: 'Please add error handling', reviewer: 'user', reviewedAt: Date.now(),
      }]

      ctx.mockClient.mocks.sessionCreate.mockResolvedValue({ data: { id: 'session-redispatch-1' } })
      await ctx.orchestrator.dispatchTask(id)

      // Verify prompt includes feedback
      const promptCall = ctx.mockClient.mocks.sessionPrompt.mock.calls[0]?.[0]
      expect(promptCall).toBeDefined()
      const promptArgs = JSON.stringify(promptCall)
      expect(promptArgs).toContain('前次执行反馈')
      expect(promptArgs).toContain('Please add error handling')
    })
  })

})
