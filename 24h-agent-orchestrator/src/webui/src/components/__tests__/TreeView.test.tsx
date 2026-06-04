// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { TreeView } from '../TreeView.js'
import type { TaskNode } from '../../types.js'

afterEach(cleanup)

describe('TreeView', () => {
  const baseTask: TaskNode = {
    id: 'task-1', description: 'test task', status: 'pending',
    dependsOn: [], retryCount: 0, maxRetries: 10,
  }

const noop = () => {}

function renderTree(tasks: TaskNode[], agents: Array<{ sessionId: string; taskId: string; healthStatus: string; lastHeartbeat: number; startTime: number }> = [], extra: Partial<Parameters<typeof TreeView>[0]> = {}) {
  return render(
    <TreeView tasks={tasks} agents={agents} selectedTaskId={extra.selectedTaskId} onDispatch={extra.onDispatch || noop} onAbort={extra.onAbort || noop} onSelect={extra.onSelect || noop} onDelete={extra.onDelete || noop} />
  )
}

  it('shows empty state when no tasks', () => {
    renderTree([])
    expect(screen.getByText(/暂无任务/)).toBeInTheDocument()
  })

  it('renders a pending task with description', () => {
    renderTree([baseTask])
    expect(screen.getByText('test task')).toBeInTheDocument()
  })

  it('shows running status badge', () => {
    const runningTask: TaskNode = { ...baseTask, status: 'running', sessionId: 'sess-1' }
    renderTree([runningTask], [], { onAbort: vi.fn(), onDelete: vi.fn() })
    expect(screen.getByText('running')).toBeInTheDocument()
  })

  it('shows running status for running task', () => {
    const runningTask: TaskNode = { ...baseTask, status: 'running', sessionId: 'sess-1' }
    renderTree([runningTask], [], { onDelete: vi.fn(), onAbort: vi.fn() })
    expect(screen.getByText('running')).toBeInTheDocument()
  })

  it('calls onSelect when task clicked', () => {
    const onSelect = vi.fn()
    renderTree([baseTask], [], { onSelect })
    fireEvent.click(screen.getByText('test task'))
    expect(onSelect).toHaveBeenCalledWith('task-1')
  })

  it('displays task count in footer', () => {
    renderTree([baseTask])
    expect(screen.getByText(/共 1 任务/)).toBeInTheDocument()
  })

  it('shows completed count for completed tasks', () => {
    const doneTask: TaskNode = { ...baseTask, status: 'completed' }
    renderTree([doneTask])
    expect(screen.getByText(/已完成/)).toBeInTheDocument()
  })

  it('applies selected style to selected task', () => {
    renderTree([baseTask], [], { selectedTaskId: 'task-1' })
    expect(screen.getByText('test task')).toBeInTheDocument()
  })

  it('shows phase progress for tasks with cometPhase', () => {
    const taskWithPhase: TaskNode = { ...baseTask, cometPhase: 'design' }
    renderTree([taskWithPhase])
    expect(screen.getByText(/设计/)).toBeInTheDocument()
  })

  it('shows subtasks when parent is expanded', () => {
    const childTask: TaskNode = { ...baseTask, id: 'child-1', description: '[开启]', status: 'pending', dependsOn: ['task-1'] }
    renderTree([baseTask, childTask])
    // 子任务默认不展开，点击展开按钮
    expect(screen.getByText(/1 个子任务/)).toBeInTheDocument()
  })

  it('handles multiple root tasks', () => {
    const task2: TaskNode = { ...baseTask, id: 'task-2', description: 'second task' }
    renderTree([baseTask, task2])
    expect(screen.getByText('test task')).toBeInTheDocument()
    expect(screen.getByText('second task')).toBeInTheDocument()
  })
})
