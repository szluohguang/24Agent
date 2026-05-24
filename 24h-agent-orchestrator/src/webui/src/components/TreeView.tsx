import React from 'react'
import type { TaskNode, TaskStatus } from '../types.js'

interface TreeViewProps {
  tasks: TaskNode[]
  onDispatch: (taskId: string) => void
  onAbort: (taskId: string) => void
}

const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: '○',
  running: '●',
  completed: '✓',
  failed: '✗',
  scheduled: '◷',
  queued: '◌',
  retrying: '⟳',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#8b949e',
  running: '#58a6ff',
  completed: '#3fb950',
  failed: '#f85149',
  scheduled: '#d29922',
  queued: '#8b949e',
  retrying: '#f0883e',
}

function TaskSummary({ tasks }: { tasks: TaskNode[] }) {
  const counts = { pending: 0, running: 0, completed: 0, failed: 0, scheduled: 0, queued: 0, retrying: 0 }
  for (const t of tasks) counts[t.status]++
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 12px', fontSize: 12, color: '#8b949e', borderBottom: '1px solid #21262d' }}>
      <span>Total: {tasks.length}</span>
      {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
        <span key={k} style={{ color: STATUS_COLORS[k as TaskStatus] }}>{STATUS_ICONS[k as TaskStatus]} {v} {k}</span>
      ))}
    </div>
  )
}

export function TreeView({ tasks, onDispatch, onAbort }: TreeViewProps) {
  if (tasks.length === 0) {
    return (
      <div style={{ padding: 16, color: '#8b949e' }}>
        No tasks yet. Create one below.
      </div>
    )
  }

  return (
    <div>
      <TaskSummary tasks={tasks} />
      <div style={{ padding: 8 }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              padding: '8px 12px', margin: 4, borderRadius: 6, background: '#161b22',
              border: '1px solid #30363d', fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: STATUS_COLORS[task.status], fontWeight: 'bold' }}>
                {STATUS_ICONS[task.status]}
              </span>
              <span style={{ flex: 1 }}>{task.description}</span>
              {task.status === 'retrying' && task.retryCount !== undefined && (
                <span style={{ background: '#f0883e33', color: '#f0883e', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                  retry {task.retryCount}/{task.maxRetries ?? 10}
                </span>
              )}
              <span style={{ color: STATUS_COLORS[task.status], fontSize: 11 }}>
                {task.status}
              </span>
            </div>
            {task.status === 'pending' && (
              <button onClick={() => onDispatch(task.id)} style={dispatchBtnStyle}>Dispatch</button>
            )}
            {task.status === 'running' && (
              <button onClick={() => onAbort(task.id)} style={abortBtnStyle}>Abort</button>
            )}
            {task.dependsOn.length > 0 && (
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                depends on: {task.dependsOn.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const dispatchBtnStyle: React.CSSProperties = {
  marginTop: 6, padding: '4px 12px', background: '#238636', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
}

const abortBtnStyle: React.CSSProperties = {
  marginTop: 6, padding: '4px 12px', background: '#da3633', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
}
