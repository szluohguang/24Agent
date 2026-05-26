// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { SystemOverview } from '../SystemOverview.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('SystemOverview', () => {
  it('renders all metric cards with correct values', () => {
    const data = {
      agents: { active: 3, total: 5 },
      tasks: { total: 10, running: 2, failed: 1 },
    }
    renderWithIntl(<SystemOverview data={data} />)
    expect(screen.getByText(/health\.active/)).toBeInTheDocument()
    expect(screen.getByText(/health\.status/)).toBeInTheDocument()
    expect(screen.getByText(/health\.retries/)).toBeInTheDocument()
    expect(screen.getByText(/health\.budget/)).toBeInTheDocument()
  })

  it('displays active agent count correctly', () => {
    const data = {
      agents: { active: 7, total: 10 },
      tasks: { total: 20, running: 5, failed: 2 },
    }
    renderWithIntl(<SystemOverview data={data} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('displays status as active/total', () => {
    const data = {
      agents: { active: 3, total: 5 },
      tasks: { total: 10, running: 2, failed: 1 },
    }
    renderWithIntl(<SystemOverview data={data} />)
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('shows stale message when no data provided', () => {
    renderWithIntl(<SystemOverview />)
    expect(screen.getByText(/health\.stale/)).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    const data = {
      agents: { active: 0, total: 0 },
      tasks: { total: 0, running: 0, failed: 0 },
    }
    renderWithIntl(<SystemOverview data={data} />)
    expect(screen.getAllByText('0')).toHaveLength(2)
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })
})
