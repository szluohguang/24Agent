import React from 'react'

export interface TaskNode {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  sessionId?: string
  dependsOn: string[]
}

interface TreeViewProps {
  tasks: TaskNode[]
  onDispatch: (taskId: string) => void
  onAbort: (taskId: string) => void
}

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  running: '●',
  completed: '✓',
  failed: '✗',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#8b949e',
  running: '#58a6ff',
  completed: '#3fb950',
  failed: '#f85149',
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
    <div style={{ padding: 8 }}>
      {tasks.map((task) => (
        <div
          key={task.id}
          style={{
            padding: '8px 12px',
            margin: 4,
            borderRadius: 6,
            background: '#161b22',
            border: '1px solid #30363d',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: STATUS_COLORS[task.status], fontWeight: 'bold' }}>
              {STATUS_ICONS[task.status]}
            </span>
            <span style={{ flex: 1 }}>{task.description}</span>
            <span style={{ color: '#8b949e', fontSize: 11 }}>
              {task.status}
            </span>
          </div>
          {task.status === 'pending' && (
            <button
              onClick={() => onDispatch(task.id)}
              style={{
                marginTop: 6,
                padding: '4px 12px',
                background: '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Dispatch
            </button>
          )}
          {task.status === 'running' && (
            <button
              onClick={() => onAbort(task.id)}
              style={{
                marginTop: 6,
                padding: '4px 12px',
                background: '#da3633',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Abort
            </button>
          )}
          {task.dependsOn.length > 0 && (
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
              depends on: {task.dependsOn.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
