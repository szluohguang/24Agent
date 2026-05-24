import { describe, it, expect, beforeEach } from 'vitest'
import { evaluateTaskCompletion } from '../evaluator.js'
import { createMockClient } from '../../test-utils/factories.js'

describe('evaluateTaskCompletion()', () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mockClient = createMockClient()
  })

  it('should extract summary from last assistant message', async () => {
    mockClient.mocks.sessionMessages.mockResolvedValue({
      data: {
        items: [
          { role: 'user', content: 'Do something' },
          { role: 'assistant', summary: { body: 'Implemented feature X' }, cost: 0.005, tokens: { input: 200, output: 150 } },
        ],
      },
    })
    mockClient.mocks.sessionDiff.mockResolvedValue({ data: [{ file: 'src/feature.ts' }] })

    const result = await evaluateTaskCompletion(mockClient.client as never, 'session-1')

    expect(result.summary).toBe('Implemented feature X')
    expect(result.cost).toBe(0.005)
    expect(result.tokens).toEqual({ input: 200, output: 150 })
    expect(result.artifacts).toEqual(['src/feature.ts'])
  })

  it('should extract artifacts from diff entries', async () => {
    mockClient.mocks.sessionMessages.mockResolvedValue({
      data: {
        items: [
          { role: 'assistant', summary: { body: 'Multiple files' }, cost: 0.01 },
        ],
      },
    })
    mockClient.mocks.sessionDiff.mockResolvedValue({
      data: [
        { file: 'src/a.ts', diff: '...' },
        { file: 'src/b.ts', diff: '...' },
        { file: 'src/c.ts', diff: '...' },
      ],
    })

    const result = await evaluateTaskCompletion(mockClient.client as never, 'session-1')

    expect(result.artifacts).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts'])
  })

  it('should return empty values when no assistant messages exist', async () => {
    mockClient.mocks.sessionMessages.mockResolvedValue({
      data: {
        items: [
          { role: 'user', content: 'Hello' },
        ],
      },
    })
    mockClient.mocks.sessionDiff.mockResolvedValue({ data: [] })

    const result = await evaluateTaskCompletion(mockClient.client as never, 'session-1')

    expect(result.summary).toBe('')
    expect(result.cost).toBe(0)
    expect(result.artifacts).toEqual([])
    expect(result.tokens).toBeUndefined()
  })

  it('should handle messages without data wrapper', async () => {
    mockClient.mocks.sessionMessages.mockResolvedValue([
      { role: 'assistant', summary: { body: 'Direct result' }, cost: 0.003 },
    ])
    mockClient.mocks.sessionDiff.mockResolvedValue([{ file: 'src/direct.ts' }])

    const result = await evaluateTaskCompletion(mockClient.client as never, 'session-1')

    expect(result.summary).toBe('Direct result')
    expect(result.cost).toBe(0.003)
    expect(result.artifacts).toEqual(['src/direct.ts'])
  })

  it('should handle summary as non-object gracefully', async () => {
    mockClient.mocks.sessionMessages.mockResolvedValue({
      data: {
        items: [
          { role: 'assistant', summary: 'just a string', cost: 0.001 },
        ],
      },
    })
    mockClient.mocks.sessionDiff.mockResolvedValue({ data: [] })

    const result = await evaluateTaskCompletion(mockClient.client as never, 'session-1')

    expect(result.summary).toBe('')
  })
})
