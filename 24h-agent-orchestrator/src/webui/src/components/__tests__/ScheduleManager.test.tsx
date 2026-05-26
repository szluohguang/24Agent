// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { ScheduleManager } from '../ScheduleManager.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('ScheduleManager', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', {
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows empty state when no schedules', async () => {
    renderWithIntl(<ScheduleManager />)
    await waitFor(() => {
      expect(screen.getByText(/schedule\.noSchedules/)).toBeInTheDocument()
    })
  })

  it('renders title and create button', () => {
    renderWithIntl(<ScheduleManager />)
    expect(screen.getByText(/schedule\.title/)).toBeInTheDocument()
    expect(screen.getByText(/schedule\.create/)).toBeInTheDocument()
  })

  it('shows schedule form when create button clicked', () => {
    renderWithIntl(<ScheduleManager />)
    fireEvent.click(screen.getByText(/schedule\.create/))
    expect(screen.getByPlaceholderText(/scheduleform\.desc/)).toBeInTheDocument()
    expect(screen.getByText(/scheduleform\.create/)).toBeInTheDocument()
  })

  it('renders schedule list with toggle and delete buttons', async () => {
    const mockSchedules = [
      { id: 's1', description: 'Daily backup', cronExpr: '0 9 * * *', permission: 'safe', budget: 10, maxRetries: 3, enabled: true, lastTriggered: 0 },
    ]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockSchedules), {
      headers: { 'Content-Type': 'application/json' },
    }))
    renderWithIntl(<ScheduleManager />)
    await waitFor(() => {
      expect(screen.getByText('Daily backup')).toBeInTheDocument()
    })
    expect(screen.getByText(/schedule\.delete/)).toBeInTheDocument()
    expect(screen.getByText(/schedule\.on/)).toBeInTheDocument()
  })

  it('calls fetch to load schedules on mount', async () => {
    renderWithIntl(<ScheduleManager />)
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/schedule')
    })
  })
})
