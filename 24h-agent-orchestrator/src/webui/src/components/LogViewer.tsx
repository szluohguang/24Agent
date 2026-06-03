import { useState, useMemo } from 'react'
import type { SystemLogEntry } from '../types'

const TYPE_COLORS: Record<string, string> = {
  info: '#58a6ff',
  warning: '#d29922',
  error: '#da3633',
}
const TYPE_LABELS: Record<string, string> = {
  all: '全部', info: 'Info', warning: 'Warning', error: 'Error',
}

export function LogViewer({ logs, onClose, onAcknowledge }: {
  logs: SystemLogEntry[]
  onClose: () => void
  onAcknowledge: (id: string) => void
}) {
  const [filter, setFilter] = useState<string>('all')
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const list = filter === 'all' ? logs : logs.filter(e => e.type === filter)
    return [...list].reverse()
  }, [logs, filter])

  const handleClick = (entry: SystemLogEntry) => {
    if (entry.type === 'error' && !clickedIds.has(entry.id)) {
      setClickedIds(prev => new Set(prev).add(entry.id))
      onAcknowledge(entry.id)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column', zIndex: 1000,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 16px',
        background: '#161b22', borderBottom: '1px solid #30363d',
      }}>
        <span style={{ color: '#c9d1d9', fontWeight: 600, fontSize: 14, flex: 1 }}>系统日志</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'info', 'warning', 'error'] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              background: filter === t ? '#30363d' : 'transparent',
              color: filter === t ? '#c9d1d9' : '#8b949e',
              border: '1px solid #30363d', borderRadius: 4,
              padding: '4px 10px', fontSize: 12, cursor: 'pointer',
            }}>{TYPE_LABELS[t]}</button>
          ))}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: '#8b949e',
          fontSize: 18, cursor: 'pointer', marginLeft: 12,
        }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8, background: '#0d1117' }}>
        {filtered.map(entry => (
          <div key={entry.id} onClick={() => handleClick(entry)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '6px 10px', borderBottom: '1px solid #21262d',
            cursor: entry.type === 'error' ? 'pointer' : 'default',
            background: entry.type === 'error' && !entry.acknowledged && !clickedIds.has(entry.id)
              ? 'rgba(218,54,51,0.08)' : 'transparent',
          }}>
            <span style={{
              flexShrink: 0, width: 10, height: 10, borderRadius: '50%',
              background: TYPE_COLORS[entry.type] || '#8b949e', marginTop: 4,
            }} />
            <span style={{ flexShrink: 0, color: '#8b949e', fontSize: 11, width: 70 }}>
              {new Date(entry.time).toLocaleTimeString()}
            </span>
            <span style={{
              flexShrink: 0, color: TYPE_COLORS[entry.type], fontSize: 11,
              width: 50, fontWeight: 600,
            }}>{entry.type.toUpperCase()}</span>
            <span style={{ flexShrink: 0, color: '#8b949e', fontSize: 11, width: 80 }}>
              [{entry.source}]
            </span>
            <span style={{ color: '#c9d1d9', fontSize: 12, flex: 1 }}>
              {entry.message}
              {entry.count && entry.count > 1 ? ` (×${entry.count})` : ''}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
            暂无日志
          </div>
        )}
      </div>
    </div>
  )
}
