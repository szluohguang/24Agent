import React, { useMemo, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'

interface HistoryEntry {
  id: string; time: number; source: string
  sessionId?: string; type: string; message: string
}

interface HistoryPanelProps {
  entries: HistoryEntry[]
}

const SOURCE_COLORS: Record<string, string> = {
  main: '#58a6ff', sub: '#d2a8ff',
  system: '#8b949e', user: '#3fb950',
}

const TYPE_LABELS: Record<string, string> = {
  start: '🚀', stop: '⏹', 'task-add': '📋', dispatch: '📤',
  complete: '✅', 'awaiting-review': '👀', retry: '🔄',
  'max-retries': '❌', abort: '⛔', 'task-delete': '🗑',
  'follow-up': '💬', 'review-approved': '👍', 'review-rejected': '👎',
  tool: '🔧', shell: '💻', idle: '⏳', 'budget-limit': '💰',
  'hung-recovery': '🔄', 'hung-failed': '💀',
  'eval-error': '⚠️',
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

export function HistoryPanel({ entries }: HistoryPanelProps) {
  const intl = useIntl()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const sources = useMemo(() => {
    const s = new Set(entries.map((e) => e.source))
    return ['all', ...s]
  }, [entries])

  const types = useMemo(() => {
    const t = new Set(entries.map((e) => e.type))
    return ['all', ...t]
  }, [entries])

  const filtered = useMemo(() => {
    let list = entries
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.message.toLowerCase().includes(q) || e.type.includes(q) || e.id.includes(q))
    }
    if (sourceFilter !== 'all') list = list.filter((e) => e.source === sourceFilter)
    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter)
    return list
  }, [entries, search, sourceFilter, typeFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>()
    for (const entry of filtered) {
      const key = formatDate(entry.time)
      const group = map.get(key)
      if (group) group.push(entry)
      else map.set(key, [entry])
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const selectStyle: React.CSSProperties = {
    padding: '3px 6px', background: '#0d1117', color: '#c9d1d9',
    border: '1px solid #30363d', borderRadius: 4, fontSize: 12,
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '8px', borderBottom: '1px solid #30363d', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={intl.formatMessage({ id: 'history.search' })}
          style={{
            flex: 1, minWidth: 150, padding: '4px 8px', background: '#0d1117',
            color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, fontSize: 12,
          }}
        />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={selectStyle}>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? intl.formatMessage({ id: 'history.allSources' }) : s}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          {types.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? intl.formatMessage({ id: 'history.allTypes' }) : t}
            </option>
          ))}
        </select>
        <span style={{ color: '#8b949e', fontSize: 11, alignSelf: 'center', whiteSpace: 'nowrap' }}>
          <FormattedMessage id="history.count" values={{ count: filtered.length }} />
        </span>
      </div>

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 4, fontSize: 12 }}>
        {grouped.length === 0 ? (
          <div style={{ padding: 16, color: '#8b949e', fontStyle: 'italic', textAlign: 'center' }}>
            <FormattedMessage id="history.empty" />
          </div>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div style={{
                padding: '4px 8px', marginTop: 4, marginBottom: 2,
                color: '#8b949e', fontSize: 11, fontWeight: 600,
                borderBottom: '1px solid #21262d',
              }}>
                {date} — {items.length} <FormattedMessage id="history.events" />
              </div>
              {items.map((entry) => {
                const borderColor = SOURCE_COLORS[entry.source] || '#8b949e'
                const icon = TYPE_LABELS[entry.type] || '•'
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', gap: 6, padding: '3px 8px',
                      borderLeft: `2px solid ${borderColor}`,
                      marginLeft: 4, marginBottom: 1,
                      alignItems: 'center',
                    }}
                    title={`${entry.type} | ${entry.id}`}
                  >
                    <span style={{ minWidth: 16, textAlign: 'center' }}>{icon}</span>
                    <span style={{ color: '#8b949e', whiteSpace: 'nowrap', minWidth: 55 }}>
                      {formatTime(entry.time)}
                    </span>
                    <span style={{
                      color: SOURCE_COLORS[entry.source] || '#8b949e',
                      minWidth: 36, fontSize: 11, fontWeight: 600,
                    }}>
                      {entry.source}
                    </span>
                    <span style={{ color: '#c9d1d9', wordBreak: 'break-word' }}>{entry.message}</span>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
