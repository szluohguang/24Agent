// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { TreeView } from '../TreeView.js'
import type { TaskNode } from '../../types.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('TreeView', () => {
  const baseTask: TaskNode = {
    id: 'task-1', description: 'test task', status: 'pending',
    dependsOn: [], retryCount: 0, maxRetries: 10,
  }

const noop = () => {}

function renderTree(tasks: TaskNode[], agents: Array<{ sessionId: string; taskId: string; healthStatus: string; lastHeartbeat: number; startTime: number }> = [], extra: Partial<Parameters<typeof TreeView>[0]> = {}) {
  return renderWithIntl(
    <TreeView tasks={tasks} agents={agents} selectedTaskId={extra.selectedTaskId} onDispatch={extra.onDispatch || noop} onAbort={extra.onAbort || noop} onSelect={extra.onSelect || noop} />
  )
}

  it('shows empty state when no tasks', () => {
    renderTree([])
    expect(screen.getByText(/app\.noTasks/)).toBeInTheDocument()
  })

  it('renders a pending task with dispatch button', () => {
    renderTree([baseTask])
    expect(screen.getByText('test task')).toBeInTheDocument()
    expect(screen.getByText(/task\.dispatch/)).toBeInTheDocument()
  })

  it('shows abort button for running task', () => {
    const runningTask: TaskNode = { ...baseTask, status: 'running', sessionId: 'sess-1' }
    renderTree([runningTask])
    expect(screen.getByText(/task\.abort/)).toBeInTheDocument()
    expect(screen.queryByText(/task\.dispatch/)).not.toBeInTheDocument()
  })

  it('calls onDispatch when dispatch button clicked', () => {
    const onDispatch = vi.fn()
    renderTree([baseTask], [], { onDispatch })
    fireEvent.click(screen.getByText(/task\.dispatch/))
    expect(onDispatch).toHaveBeenCalledWith('task-1')
  })

  it('calls onAbort when abort button clicked', () => {
    const onAbort = vi.fn()
    const runningTask: TaskNode = { ...baseTask, status: 'running', sessionId: 'sess-1' }
    renderTree([runningTask], [], { onAbort })
    fireEvent.click(screen.getByText(/task\.abort/))
    expect(onAbort).toHaveBeenCalledWith('task-1')
  })

  it('calls onSelect when task item clicked', () => {
    const onSelect = vi.fn()
    renderTree([baseTask], [], { onSelect })
    fireEvent.click(screen.getByText('test task'))
    expect(onSelect).toHaveBeenCalledWith('task-1')
  })

  it('applies selected style to selected task', () => {
    renderTree([baseTask], [], { selectedTaskId: 'task-1', onSelect: noop })
    const taskEl = screen.getByText('test task').closest('div[style*="cursor: pointer"]')
    expect(taskEl).not.toBeNull()
  })

  it('displays retry badge for retrying task', () => {
    const retryingTask: TaskNode = { ...baseTask, status: 'retrying', retryCount: 2, maxRetries: 5 }
    renderTree([retryingTask])
    expect(screen.getByText(/treeview\.retry/)).toBeInTheDocument()
  })

  it('shows dependency info when task has dependencies', () => {
    const depTask: TaskNode = { ...baseTask, dependsOn: ['task-0'] }
    renderTree([depTask])
    expect(screen.getByText(/treeview\.depends/)).toBeInTheDocument()
  })

  it('shows subagent info when agent is present', () => {
    const runningTask: TaskNode = { ...baseTask, status: 'running', sessionId: 'sess-abc' }
    renderTree([runningTask], [{ sessionId: 'sess-abc', taskId: 'task-1', healthStatus: 'healthy', lastHeartbeat: Date.now(), startTime: Date.now() }])
    expect(screen.getByText(/sess-abc/)).toBeInTheDocument()
    expect(screen.getByText(/healthy/)).toBeInTheDocument()
  })

  it('renders all status icons correctly', () => {
    const statuses: Array<TaskNode['status']> = ['pending', 'running', 'completed', 'failed', 'scheduled', 'queued', 'retrying']
    const tasks = statuses.map((status, i) => ({
      ...baseTask, id: `task-${i}`, status, description: `task-${status}`,
    }))
    renderTree(tasks)
    for (const t of tasks) {
      expect(screen.getByText(`task-${t.status}`)).toBeInTheDocument()
    }
  })
})
