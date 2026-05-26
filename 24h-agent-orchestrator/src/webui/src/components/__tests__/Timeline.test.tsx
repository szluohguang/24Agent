// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { Timeline } from '../Timeline.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('Timeline', () => {
  const baseEntry = { id: 'e1', time: Date.now(), source: 'main', type: 'dispatch', message: 'Dispatching task' }

  it('shows empty state when no entries', () => {
    renderWithIntl(<Timeline entries={[]} />)
    expect(screen.getByText(/timeline\.noEvents/)).toBeInTheDocument()
  })

  it('renders timeline entries with source color indicator', () => {
    renderWithIntl(<Timeline entries={[baseEntry]} />)
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('Dispatching task')).toBeInTheDocument()
  })

  it('renders entries from all sources', () => {
    const entries = [
      { id: 'e1', time: Date.now(), source: 'main', type: 'dispatch', message: 'main msg' },
      { id: 'e2', time: Date.now(), source: 'sub', type: 'complete', message: 'sub msg' },
      { id: 'e3', time: Date.now(), source: 'system', type: 'start', message: 'system msg' },
      { id: 'e4', time: Date.now(), source: 'user', type: 'abort', message: 'user msg' },
    ]
    renderWithIntl(<Timeline entries={entries} />)
    for (const e of entries) {
      expect(screen.getByText(e.message)).toBeInTheDocument()
    }
  })

  it('shows filter buttons by default', () => {
    renderWithIntl(<Timeline entries={[baseEntry]} />)
    expect(screen.getByText(/timeline\.filter\.all/)).toBeInTheDocument()
    expect(screen.getByText(/timeline\.filter\.recovery/)).toBeInTheDocument()
    expect(screen.getByText(/timeline\.filter\.normal/)).toBeInTheDocument()
  })

  it('shows event count', () => {
    renderWithIntl(<Timeline entries={[baseEntry]} />)
    expect(screen.getByText(/timeline\.events/)).toBeInTheDocument()
  })

  it('applies recovery filter', () => {
    const entries = [
      { id: 'e1', time: Date.now(), source: 'main', type: 'dispatch', message: 'normal' },
      { id: 'e2', time: Date.now(), source: 'system', type: 'retry', message: 'recovery action' },
      { id: 'e3', time: Date.now(), source: 'system', type: 'hung-recovery', message: 'hung recovery' },
    ]
    renderWithIntl(<Timeline entries={entries} />)
    expect(screen.getByText('normal')).toBeInTheDocument()
    expect(screen.getByText('recovery action')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/timeline\.filter\.recovery/))
    expect(screen.queryByText('normal')).not.toBeInTheDocument()
    expect(screen.getByText('recovery action')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/timeline\.filter\.normal/))
    expect(screen.getByText('normal')).toBeInTheDocument()
    expect(screen.queryByText('recovery action')).not.toBeInTheDocument()
  })

  it('handles sessionId display', () => {
    const entry = { ...baseEntry, sessionId: 'sess-abc' }
    renderWithIntl(<Timeline entries={[entry]} />)
    expect(screen.getByText('Dispatching task')).toBeInTheDocument()
  })
})
