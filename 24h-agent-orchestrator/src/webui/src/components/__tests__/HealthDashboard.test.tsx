// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { HealthDashboard } from '../HealthDashboard.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('HealthDashboard', () => {
  it('renders agent health status correctly', () => {
    const agents = [
      { sessionId: 'sess-001', taskId: 'task-1', status: 'running', healthStatus: 'healthy', lastHeartbeat: Date.now(), startTime: Date.now() - 300000 },
      { sessionId: 'sess-004', taskId: 'task-4', status: 'failed', healthStatus: 'dead', lastHeartbeat: 0, startTime: 0 },
    ]

    renderWithIntl(<HealthDashboard agents={agents} stale={false} />)

    expect(screen.getByText(/sess-001/)).toBeInTheDocument()
    expect(screen.getByText(/健康/)).toBeInTheDocument()
    expect(screen.getByText(/已停止/)).toBeInTheDocument()
  })

  it('renders stale indicator when data is stale', () => {
    renderWithIntl(<HealthDashboard agents={[]} stale={true} />)
    expect(screen.getByText(/健康数据过期/)).toBeInTheDocument()
  })

  it('shows no agents message when list is empty and not stale', () => {
    renderWithIntl(<HealthDashboard agents={[]} stale={false} />)
    expect(screen.getByText(/暂无 Agent/)).toBeInTheDocument()
  })
})
