import React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type { TaskNode, TaskStatus } from '../types.js'

interface AgentInfo {
  sessionId: string
  taskId: string
  healthStatus: string
  lastHeartbeat: number
  startTime: number
}

interface TreeViewProps {
  tasks: TaskNode[]
  agents: AgentInfo[]
  selectedTaskId?: string
  onDispatch: (taskId: string) => void
  onAbort: (taskId: string) => void
  onSelect: (taskId: string) => void
  onDelete: (taskId: string) => void
}

const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: '○',
  running: '●',
  completed: '✓',
  failed: '✗',
  scheduled: '◷',
  queued: '◌',
  retrying: '⟳',
  awaiting_review: '◉',
  rejected: '✕',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#8b949e',
  running: '#58a6ff',
  completed: '#3fb950',
  failed: '#f85149',
  scheduled: '#d29922',
  queued: '#8b949e',
  retrying: '#f0883e',
  awaiting_review: '#d29922',
  rejected: '#f85149',
}

const HEALTH_ICONS: Record<string, string> = {
  healthy: '✓',
  suspected: '?',
  hung: '☉',
  dead: '✗',
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#3fb950',
  suspected: '#d29922',
  hung: '#f0883e',
  dead: '#f85149',
}

function TaskSummary({ tasks }: { tasks: TaskNode[] }) {
  const intl = useIntl()
  const counts = { pending: 0, running: 0, completed: 0, failed: 0, scheduled: 0, queued: 0, retrying: 0, awaiting_review: 0, rejected: 0 }
  for (const t of tasks) counts[t.status]++
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 12px', fontSize: 12, color: '#8b949e', borderBottom: '1px solid #21262d', flexWrap: 'wrap' }}>
      <span><FormattedMessage id="task.summary" values={{ total: tasks.length, pending: counts.pending, completed: counts.completed }} /></span>
      {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
        <span key={k} style={{ color: STATUS_COLORS[k as TaskStatus] }}>{STATUS_ICONS[k as TaskStatus]} {v} {intl.formatMessage({ id: 'task.status.' + k })}</span>
      ))}
    </div>
  )
}

export function TreeView({ tasks, agents, selectedTaskId, onDispatch, onAbort, onSelect }: TreeViewProps) {
  const intl = useIntl()

  if (tasks.length === 0) {
    return (
      <div style={{ padding: 16, color: '#8b949e' }}>
        <FormattedMessage id="app.noTasks" />
      </div>
    )
  }

  return (
    <div>
      <TaskSummary tasks={tasks} />
      <div style={{ padding: 8 }}>
        {tasks.map((task) => {
          const agent = task.sessionId ? agents.find((a) => a.sessionId === task.sessionId) : undefined
          const isSelected = task.id === selectedTaskId
          return (
            <div
              key={task.id}
              onClick={() => onSelect(task.id)}
              style={{
                padding: '8px 12px', margin: '4px 0', borderRadius: 6,
                background: isSelected ? '#1f2937' : '#161b22',
                border: isSelected ? '1px solid #58a6ff' : '1px solid #30363d',
                fontSize: 13, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: STATUS_COLORS[task.status], fontWeight: 'bold' }}>
                  {STATUS_ICONS[task.status]}
                </span>
                <span style={{ flex: 1 }}>{task.description}</span>
                {task.status === 'retrying' && task.retryCount !== undefined && (
                  <span style={{ background: '#f0883e33', color: '#f0883e', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    <FormattedMessage id="treeview.retry" values={{ n: task.retryCount, m: task.maxRetries ?? 10 }} />
                  </span>
                )}
                <span style={{ color: STATUS_COLORS[task.status], fontSize: 11 }}>
                  {intl.formatMessage({ id: 'task.status.' + task.status })}
                </span>
              </div>

              {/* Subagent info */}
              {agent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11 }}>
                  <span style={{ fontFamily: 'monospace', color: '#8b949e' }}>
                    [{agent.sessionId.slice(0, 8)}]
                  </span>
                  <span style={{ color: HEALTH_COLORS[agent.healthStatus] || '#8b949e' }}>
                    {HEALTH_ICONS[agent.healthStatus] || '○'} {agent.healthStatus}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {(task.status === 'pending' || task.status === 'rejected') && (
                  <button onClick={() => onDispatch(task.id)} style={dispatchBtnStyle}><FormattedMessage id="task.dispatch" /></button>
                )}
                {task.status === 'running' && (
                  <button onClick={() => onAbort(task.id)} style={abortBtnStyle}><FormattedMessage id="task.abort" /></button>
                )}
                {(task.status === 'completed' || task.status === 'failed' || task.status === 'rejected' || task.status === 'awaiting_review') && (
                  <button onClick={() => onDelete(task.id)} style={deleteBtnStyle} title="Delete"><FormattedMessage id="task.delete" /></button>
                )}
              </div>

              {task.dependsOn.length > 0 && (
                <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                  <FormattedMessage id="treeview.depends" values={{ tasks: task.dependsOn.join(', ') }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const dispatchBtnStyle: React.CSSProperties = {
  padding: '4px 12px', background: '#238636', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
}

const abortBtnStyle: React.CSSProperties = {
  padding: '4px 12px', background: '#da3633', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '4px 12px', background: '#484f58', color: '#8b949e',
  border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12,
}