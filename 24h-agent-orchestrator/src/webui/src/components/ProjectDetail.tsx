import React, { useState, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'

interface TaskNode {
  id: string
  description: string
  status: string
}

interface ProjectConfig {
  directory: string
  goal: string
  description: string
}

interface ProjectDetailProps {
  onNavigate: (page: 'home') => void
}

export function ProjectDetail({ onNavigate }: ProjectDetailProps) {
  const [config, setConfig] = useState<ProjectConfig | null>(null)
  const [tasks, setTasks] = useState<TaskNode[]>([])

  useEffect(() => {
    fetch('/api/project/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {})

    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => {
        if (data?.tasks) setTasks(data.tasks)
      })
      .catch(() => {})
  }, [])

  const statusCounts = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    running: tasks.filter((t) => t.status === 'running').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#0d1117', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => onNavigate('home')}
          style={{
            padding: '4px 12px', background: '#21262d', color: '#c9d1d9',
            border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          ← <FormattedMessage id="nav.back" />
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}><FormattedMessage id="projectDetail.title" /></h2>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: '#c9d1d9', margin: '0 0 8px' }}><FormattedMessage id="projectSettings.goal" /></h3>
        <p style={{ color: '#8b949e', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>
          {config?.goal || '-'}
        </p>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: '#c9d1d9', margin: '0 0 8px' }}><FormattedMessage id="projectSettings.description" /></h3>
        <p style={{ color: '#8b949e', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>
          {config?.description || '-'}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: '#c9d1d9', margin: '0 0 12px' }}><FormattedMessage id="projectDetail.taskStatus" /></h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'pending', count: statusCounts.pending, color: '#8b949e' },
            { label: 'running', count: statusCounts.running, color: '#58a6ff' },
            { label: 'completed', count: statusCounts.completed, color: '#3fb950' },
            { label: 'failed', count: statusCounts.failed, color: '#f85149' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '12px 16px', background: '#161b22', borderRadius: 6,
              border: '1px solid #30363d', minWidth: 100, textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                <FormattedMessage id={`task.status.${s.label}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300, padding: 16, background: '#161b22', borderRadius: 6, border: '1px solid #30363d' }}>
          <h3 style={{ fontSize: 14, color: '#c9d1d9', margin: '0 0 8px' }}><FormattedMessage id="projectDetail.plan" /></h3>
          <div style={{ color: '#8b949e', fontSize: 13, whiteSpace: 'pre-wrap' }}>-</div>
        </div>
        <div style={{ flex: 1, minWidth: 300, padding: 16, background: '#161b22', borderRadius: 6, border: '1px solid #30363d' }}>
          <h3 style={{ fontSize: 14, color: '#c9d1d9', margin: '0 0 8px' }}><FormattedMessage id="projectDetail.progress" /></h3>
          <div style={{ color: '#8b949e', fontSize: 13, whiteSpace: 'pre-wrap' }}>-</div>
        </div>
      </div>
    </div>
  )
}
