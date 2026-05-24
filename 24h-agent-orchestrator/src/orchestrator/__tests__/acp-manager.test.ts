import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildPermissionRuleset,
  createSubAgentSession,
  sendTaskPrompt,
  getSessionMessages,
  getSessionDiff,
  abortSession,
  createOpencodeServer,
} from '../acp-manager.js'
import { createMockClient } from '../../test-utils/factories.js'

vi.mock('@opencode-ai/sdk/v2', () => ({
  createOpencode: vi.fn(async () => ({
    client: { session: {}, global: {} },
    server: {},
  })),
}))

describe('ACP Manager', () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mockClient = createMockClient()
  })

  describe('buildPermissionRuleset()', () => {
    it('should return allowed rules for trusted level', () => {
      const rules = buildPermissionRuleset('trusted')
      expect(rules).toHaveLength(1)
      expect(rules[0]).toEqual({ permission: '*', pattern: '**', action: 'allow' })
    })

    it('should return allowed rules for safe level', () => {
      const rules = buildPermissionRuleset('safe')
      expect(rules.length).toBeGreaterThan(3)
      rules.forEach(r => expect(r.action).toBe('allow'))
    })

    it('should return ask rules for strict level', () => {
      const rules = buildPermissionRuleset('strict')
      expect(rules).toHaveLength(1)
      expect(rules[0]).toEqual({ permission: '*', pattern: '**', action: 'ask' })
    })
  })

  describe('createSubAgentSession()', () => {
    it('should create a session with correct parameters', async () => {
      mockClient.mocks.sessionCreate.mockResolvedValue({
        data: { id: 'session-new-001' },
      })

      const result = await createSubAgentSession(
        mockClient.client,
        'task-1',
        { providerID: 'anthropic', modelID: 'claude-3' },
        'safe',
      )

      expect(result.id).toBe('session-new-001')
      expect(mockClient.mocks.sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task: task-1',
          model: { id: 'claude-3', providerID: 'anthropic' },
          permission: expect.any(Array),
        }),
      )
    })

    it('should handle result without data wrapper', async () => {
      mockClient.mocks.sessionCreate.mockResolvedValue({ id: 'session-direct' })

      const result = await createSubAgentSession(
        mockClient.client,
        'task-2',
        { providerID: 'openai', modelID: 'gpt-4' },
        'trusted',
      )

      expect(result.id).toBe('session-direct')
    })
  })

  describe('sendTaskPrompt()', () => {
    it('should send prompt to session', async () => {
      mockClient.mocks.sessionPrompt.mockResolvedValue(undefined)

      await sendTaskPrompt(mockClient.client, 'session-1', 'Do the thing')

      expect(mockClient.mocks.sessionPrompt).toHaveBeenCalledWith({
        sessionID: 'session-1',
        parts: [{ type: 'text', text: 'Do the thing' }],
      })
    })
  })

  describe('getSessionMessages()', () => {
    it('should fetch messages from session', async () => {
      const mockMessages = { data: { items: [{ role: 'assistant', content: 'Done' }] } }
      mockClient.mocks.sessionMessages.mockResolvedValue(mockMessages)

      const result = await getSessionMessages(mockClient.client, 'session-1')

      expect(result).toEqual(mockMessages.data)
      expect(mockClient.mocks.sessionMessages).toHaveBeenCalledWith({
        sessionID: 'session-1',
        limit: 50,
      })
    })

    it('should handle direct result without data wrapper', async () => {
      const directResult = [{ role: 'assistant', content: 'Done' }]
      mockClient.mocks.sessionMessages.mockResolvedValue(directResult)

      const result = await getSessionMessages(mockClient.client, 'session-1')
      expect(result).toEqual(directResult)
    })
  })

  describe('getSessionDiff()', () => {
    it('should fetch diff from session', async () => {
      const mockDiff = { data: [{ file: 'src/foo.ts', diff: '...' }] }
      mockClient.mocks.sessionDiff.mockResolvedValue(mockDiff)

      const result = await getSessionDiff(mockClient.client, 'session-1')

      expect(result).toEqual(mockDiff.data)
      expect(mockClient.mocks.sessionDiff).toHaveBeenCalledWith({
        sessionID: 'session-1',
      })
    })

    it('should handle direct result without data wrapper', async () => {
      const directResult = [{ file: 'src/bar.ts' }]
      mockClient.mocks.sessionDiff.mockResolvedValue(directResult)

      const result = await getSessionDiff(mockClient.client, 'session-1')
      expect(result).toEqual(directResult)
    })
  })

  describe('abortSession()', () => {
    it('should abort a session', async () => {
      mockClient.mocks.sessionAbort.mockResolvedValue(undefined)

      await abortSession(mockClient.client, 'session-1')

      expect(mockClient.mocks.sessionAbort).toHaveBeenCalledWith({
        sessionID: 'session-1',
      })
    })
  })

  describe('createOpencodeServer()', () => {
    it('should create opencode server and return client+server', async () => {
      const result = await createOpencodeServer()
      expect(result.client).toBeDefined()
      expect(result.server).toBeDefined()
    })
  })
})
