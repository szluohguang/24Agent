import React, { useRef, useEffect } from 'react'
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

export function Timeline({ entries }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div style={{ padding: 16, color: '#8b949e', fontStyle: 'italic' }}>
        <FormattedMessage id="timeline.noEvents" />
      </div>
    )
  }

  return (
    <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', padding: 8, fontSize: 12 }}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex', gap: 8, padding: '4px 8px',
            borderLeft: `2px solid ${SOURCE_COLORS[entry.source] || '#8b949e'}`,
            marginLeft: 4,
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
      ))}
    </div>
  )
}
