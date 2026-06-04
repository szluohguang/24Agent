import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { OpencodeClient } from '@opencode-ai/sdk/v2'
import { Recovery } from '../recovery.js'
import type { Store } from '../store.js'
import type { TaskState } from '../types.js'
import * as eventStream from '../../observer/event-stream.js'
import * as acpManager from '../acp-manager.js'

vi.mock('../../observer/event-stream.js')
vi.mock('../acp-manager.js')

const subscribeGlobalEvents = vi.mocked(eventStream.subscribeGlobalEvents)
const abortSession = vi.mocked(acpManager.abortSession)

describe('Recovery', () => {
  let mockClient: OpencodeClient
  let mockEventHandlers: object
  let mockStore: Store
  let recovery: Recovery

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {} as OpencodeClient
    mockEventHandlers = {}
    mockStore = {
      getTasksByStatus: vi.fn() as unknown as Store['getTasksByStatus'],
      getAgentsByTaskId: vi.fn() as unknown as Store['getAgentsByTaskId'],
      updateTask: vi.fn() as unknown as Store['updateTask'],
    } as Store
    recovery = new Recovery(
      mockClient,
      mockEventHandlers,
      mockStore,
      {
        onSseReconnected: vi.fn() as () => void,
      },
      5,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('attemptReconnect', () => {
    it('first attempt succeeds, returns true', async () => {
      ;(recovery as unknown as Record<string, unknown>)['baseDelay'] = 5
      ;(recovery as unknown as Record<string, unknown>)['maxDelay'] = 20
      subscribeGlobalEvents.mockResolvedValue(undefined)

      const promise = recovery.attemptReconnect()
      await new Promise<void>((r) => setTimeout(r, 50))

      const result = await promise
      expect(result).toBe(true)
      expect(subscribeGlobalEvents).toHaveBeenCalledTimes(1)
    })

    it('exponential backoff increases delay between attempts', async () => {
      ;(recovery as unknown as Record<string, unknown>)['baseDelay'] = 5
      ;(recovery as unknown as Record<string, unknown>)['maxDelay'] = 50
      subscribeGlobalEvents
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue(undefined)

      const promise = recovery.attemptReconnect()
      await new Promise<void>((r) => setTimeout(r, 100))

      const result = await promise
      expect(result).toBe(true)
      expect(subscribeGlobalEvents).toHaveBeenCalledTimes(2)
    })

    it('returns false when maxReconnectAttempts reached', async () => {
      recovery = new Recovery(mockClient, mockEventHandlers, mockStore, {
        onSseReconnected: vi.fn() as () => void,
      }, 2)
      ;(recovery as unknown as Record<string, unknown>)['baseDelay'] = 5
      ;(recovery as unknown as Record<string, unknown>)['maxDelay'] = 50
      subscribeGlobalEvents.mockRejectedValue(new Error('fail'))

      const promise = recovery.attemptReconnect()
      await new Promise<void>((r) => setTimeout(r, 200))

      const result = await promise
      expect(result).toBe(false)
    })
  })

  describe('recoverHungSession', () => {
    it('returns true when retryCount < maxRetries', async () => {
      abortSession.mockResolvedValue(undefined)

      const result = await recovery.recoverHungSession('session-1', 'task-1', 2, 5)
      expect(result).toBe(true)
      expect(abortSession).toHaveBeenCalledWith(mockClient, 'session-1')
    })

    it('returns false when retryCount >= maxRetries', async () => {
      const result = await recovery.recoverHungSession('session-1', 'task-1', 5, 5)
      expect(result).toBe(false)
      expect(abortSession).not.toHaveBeenCalled()
    })
  })

  describe('recoverStartupTasks', () => {
    it('resets all pending/running/failed tasks to pending, does not auto-dispatch', async () => {
      const pendingTask: TaskState = {
        id: 't1', description: 'p1', status: 'pending', dependsOn: [],
        retryCount: 0, maxRetries: 3, createdAt: 0, updatedAt: 0,
        priority: 0, permission: 'safe', budget: 50,
      }
      const runningTask: TaskState = {
        id: 't2', description: 'r1', status: 'running', dependsOn: [],
        retryCount: 0, maxRetries: 3, createdAt: 0, updatedAt: 0,
        priority: 0, permission: 'safe', budget: 50,
      }
      const failedTask: TaskState = {
        id: 't3', description: 'f1', status: 'failed', dependsOn: [],
        retryCount: 1, maxRetries: 3, createdAt: 0, updatedAt: 0,
        priority: 0, permission: 'safe', budget: 50,
      }

      const storeMock = mockStore as unknown as Record<string, ReturnType<typeof vi.fn>>
      storeMock['getTasksByStatus'].mockImplementation((status: string) => {
        if (status === 'pending') return [pendingTask]
        if (status === 'running') return [runningTask]
        if (status === 'failed') return [failedTask]
        return []
      })
      storeMock['getAgentsByTaskId'].mockReturnValue([])

      await recovery.recoverStartupTasks()
      // 所有任务均应被更新（重置为 pending）
      expect(storeMock['updateTask']).toHaveBeenCalledTimes(3)
      // 验证状态被重置
      expect(pendingTask.status).toBe('pending')
      expect(runningTask.status).toBe('pending')
      expect(failedTask.status).toBe('pending')
      expect(runningTask.retryCount).toBe(0)
    })

    it('resets exhausted tasks too (no auto-skip)', async () => {
      const exhaustedTask: TaskState = {
        id: 't4', description: 'exhausted', status: 'failed', dependsOn: [],
        retryCount: 3, maxRetries: 3, createdAt: 0, updatedAt: 0,
        priority: 0, permission: 'safe', budget: 50,
      }

      const storeMock = mockStore as unknown as Record<string, ReturnType<typeof vi.fn>>
      storeMock['getTasksByStatus'].mockImplementation((status: string) => {
        if (status === 'failed') return [exhaustedTask]
        return []
      })

      await recovery.recoverStartupTasks()
      // 重置时所有任务都被更新
      expect(storeMock['updateTask']).toHaveBeenCalled()
      expect(exhaustedTask.status).toBe('pending')
    })
  })
})
