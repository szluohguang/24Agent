import type { SystemLogEntry } from '../types'

const TYPE_COLORS: Record<string, string> = {
  info: '#58a6ff',
  warning: '#d29922',
  error: '#da3633',
}

export function StatusBar({ logs, onClick }: {
  logs: SystemLogEntry[]
  onClick?: () => void
}) {
  const unackedError = [...logs].reverse().find(e => e.type === 'error' && !e.acknowledged)
  const latest = unackedError || logs[logs.length - 1]

  if (!latest) return null

  const color = TYPE_COLORS[latest.type] || '#8b949e'

  return (
    <div
      onClick={onClick}
      style={{
        height: 28, display: 'flex', alignItems: 'center', padding: '0 12px',
        background: '#161b22', borderTop: '1px solid #30363d',
        fontSize: 12, cursor: 'pointer', flexShrink: 0,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: color, marginRight: 8, flexShrink: 0,
      }} />
      <span style={{ color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        [{latest.source}] {latest.message}
        {latest.count && latest.count > 1 ? ` (×${latest.count})` : ''}
      </span>
      {latest.type === 'error' && !latest.acknowledged && (
        <span style={{ color: '#da3633', fontSize: 10, marginLeft: 8, flexShrink: 0 }}>● 未确认</span>
      )}
    </div>
  )
}
