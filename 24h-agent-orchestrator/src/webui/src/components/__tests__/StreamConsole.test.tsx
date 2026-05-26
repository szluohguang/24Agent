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
  it('shows empty state when no sessions', () => {
    renderWithIntl(<StreamConsole sessions={{}} />)
    expect(screen.getByText(/stream\.noSessions/)).toBeInTheDocument()
  })

  it('renders session with stream deltas', () => {
    const sessions = {
      'sess-001': { taskId: 'task-1', stream: ['delta1', 'delta2'] },
    }
    renderWithIntl(<StreamConsole sessions={sessions} />)
    expect(screen.getByText(/sess-001/)).toBeInTheDocument()
    expect(screen.getByText(/task-1/)).toBeInTheDocument()
    expect(screen.getByText('delta1')).toBeInTheDocument()
    expect(screen.getByText('delta2')).toBeInTheDocument()
  })

  it('renders multiple sessions', () => {
    const sessions = {
      'sess-a': { taskId: 'task-1', stream: ['a'] },
      'sess-b': { taskId: 'task-2', stream: ['b'] },
    }
    renderWithIntl(<StreamConsole sessions={sessions} />)
    expect(screen.getByText(/task-1/)).toBeInTheDocument()
    expect(screen.getByText(/task-2/)).toBeInTheDocument()
  })

  it('filters by activeSessionId when provided', () => {
    const sessions = {
      'sess-a': { taskId: 'task-1', stream: ['alpha'] },
      'sess-b': { taskId: 'task-2', stream: ['beta'] },
    }
    renderWithIntl(<StreamConsole sessions={sessions} activeSessionId="sess-a" />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.queryByText('beta')).not.toBeInTheDocument()
  })
})
