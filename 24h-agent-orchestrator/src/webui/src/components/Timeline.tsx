import React, { useRef, useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'

interface TimelineEntry {
  id: string
  time: number
  source: string
  sessionId?: string
  type: string
  message: string
}

interface TimelineProps {
  entries: TimelineEntry[]
}

const SOURCE_COLORS: Record<string, string> = {
  main: '#58a6ff',
  sub: '#d2a8ff',
  system: '#8b949e',
  user: '#3fb950',
}

const RECOVERY_TYPES = new Set(['hung-recovery', 'hung-failed', 'retry', 'max-retries', 'hung', 'hung-recovery-failed', 'reconnect'])
const RECOVERY_COLORS: Record<string, string> = {
  'hung-recovery': '#d29922',
  'hung-failed': '#da3633',
  retry: '#f0883e',
  'max-retries': '#f85149',
  hung: '#f0883e',
}

type FilterMode = 'all' | 'recovery' | 'normal'

export function Timeline({ entries }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<FilterMode>('all')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  const filtered = filter === 'all' ? entries
    : filter === 'recovery' ? entries.filter((e) => RECOVERY_TYPES.has(e.type))
    : entries.filter((e) => !RECOVERY_TYPES.has(e.type))

  if (entries.length === 0) {
    return (
      <div style={{ padding: 16, color: '#8b949e', fontStyle: 'italic' }}>
        <FormattedMessage id="timeline.noEvents" />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid #30363d' }}>
        {(['all', 'recovery', 'normal'] as FilterMode[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '2px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
              background: filter === f ? '#30363d' : 'transparent',
              color: filter === f ? '#c9d1d9' : '#8b949e',
              border: '1px solid #30363d',
            }}
          >
            {f === 'all' && <FormattedMessage id="timeline.filter.all" />}
            {f === 'recovery' && <FormattedMessage id="timeline.filter.recovery" />}
            {f === 'normal' && <FormattedMessage id="timeline.filter.normal" />}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ color: '#8b949e', fontSize: 11, padding: '2px 4px' }}><FormattedMessage id="timeline.events" values={{ count: filtered.length }} /></span>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 8, fontSize: 12 }}>
        {filtered.map((entry) => {
          const isRecovery = RECOVERY_TYPES.has(entry.type)
          const borderColor = isRecovery ? (RECOVERY_COLORS[entry.type] || '#d29922') : (SOURCE_COLORS[entry.source] || '#8b949e')
          return (
            <div
              key={entry.id}
              style={{
                display: 'flex', gap: 8, padding: '4px 8px',
                borderLeft: `2px solid ${borderColor}`,
                marginLeft: 4,
                background: isRecovery ? `${borderColor}11` : 'transparent',
              }}
            >
              <span style={{ color: '#8b949e', whiteSpace: 'nowrap', minWidth: 60 }}>
                {new Date(entry.time).toLocaleTimeString()}
              </span>
              <span style={{ color: SOURCE_COLORS[entry.source] || '#8b949e', minWidth: 40 }}>
                {entry.source}
              </span>
              <span style={{ color: '#c9d1d9' }}>{entry.message}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
