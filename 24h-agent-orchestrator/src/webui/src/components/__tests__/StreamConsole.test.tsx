// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { StreamConsole } from '../StreamConsole.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('StreamConsole', () => {
  it('shows select task prompt when no sessions and no selected task', () => {
    renderWithIntl(<StreamConsole sessions={{}} sessionChunks={{}} />)
    expect(screen.getByText(/stream\.selectTask/)).toBeInTheDocument()
  })

  it('renders session with chunks', () => {
    const sessionChunks = {
      'sess-001': { taskId: 'task-1', chunks: [{ type: 'text', content: 'hello world' }] },
    }
    renderWithIntl(<StreamConsole sessions={{}} sessionChunks={sessionChunks} />)
    expect(screen.getByText(/sess-001/)).toBeInTheDocument()
    expect(screen.getByText(/task-1/)).toBeInTheDocument()
    expect(screen.getByText(/hello world/)).toBeInTheDocument()
  })

  it('renders multiple sessions', () => {
    const sessionChunks = {
      'sess-a': { taskId: 'task-1', chunks: [{ type: 'text', content: 'alpha' }] },
      'sess-b': { taskId: 'task-2', chunks: [{ type: 'text', content: 'beta' }] },
    }
    renderWithIntl(<StreamConsole sessions={{}} sessionChunks={sessionChunks} />)
    expect(screen.getByText(/task-1/)).toBeInTheDocument()
    expect(screen.getByText(/task-2/)).toBeInTheDocument()
  })

  it('filters by activeSessionId when provided', () => {
    const sessionChunks = {
      'sess-a': { taskId: 'task-1', chunks: [{ type: 'text', content: 'alpha' }] },
      'sess-b': { taskId: 'task-2', chunks: [{ type: 'text', content: 'beta' }] },
    }
    renderWithIntl(<StreamConsole sessions={{}} sessionChunks={sessionChunks} activeSessionId="sess-a" />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.queryByText('beta')).not.toBeInTheDocument()
  })

  it('trims user prompt prefix from AI response', () => {
    const sessionChunks = {
      'sess-1': { taskId: 'task-1', chunks: [{ type: 'text', content: 'What is the weather? The weather today is sunny.' }] },
    }
    renderWithIntl(<StreamConsole sessions={{}} sessionChunks={sessionChunks} activeSessionId="sess-1" lastUserPrompt="What is the weather?" />)
    expect(screen.getByText(/The weather today is sunny/)).toBeInTheDocument()
    expect(screen.queryByText(/^What is the weather\? The weather/)).toBeNull()
  })
})
