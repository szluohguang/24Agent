import React, { useState, useEffect, useCallback } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'

interface WebhookConfig {
  url: string
  events: string[]
  enabled: boolean
}

const EVENT_OPTIONS = [
  'task.completed', 'task.failed', 'task.dispatched',
  'task.awaiting_review', 'task.review_approved', 'task.review_rejected',
]

const EVENT_LABELS: Record<string, string> = {
  'task.completed': '✅ Completed',
  'task.failed': '❌ Failed',
  'task.dispatched': '📤 Dispatched',
  'task.awaiting_review': '👀 Awaiting Review',
  'task.review_approved': '👍 Approved',
  'task.review_rejected': '👎 Rejected',
}

export function WebhookManager() {
  const intl = useIntl()
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['task.completed', 'task.failed'])
  const [message, setMessage] = useState('')

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks')
      if (res.ok) setWebhooks(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleAdd = async () => {
    if (!url.trim()) return
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), events: selectedEvents }),
      })
      if (res.ok) {
        setUrl('')
        setMessage(intl.formatMessage({ id: 'webhook.added' }))
        fetchWebhooks()
      } else {
        const data = await res.json()
        setMessage(data.error || 'Error')
      }
    } catch {
      setMessage('Network error')
    }
  }

  const handleDelete = async (urlToDelete: string) => {
    try {
      const res = await fetch(`/api/webhooks?url=${encodeURIComponent(urlToDelete)}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage(intl.formatMessage({ id: 'webhook.deleted' }))
        fetchWebhooks()
      }
    } catch { /* ignore */ }
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px', background: '#0d1117', color: '#c9d1d9',
    border: '1px solid #30363d', borderRadius: 4, fontSize: 12, flex: 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
      <div style={{ fontWeight: 600, color: '#c9d1d9' }}><FormattedMessage id="webhook.title" /></div>

      {/* Add form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, background: '#161b22', borderRadius: 6, border: '1px solid #30363d' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={intl.formatMessage({ id: 'webhook.urlPlaceholder' })}
          style={inputStyle}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {EVENT_OPTIONS.map((evt) => (
            <label key={evt} style={{
              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 11, color: selectedEvents.includes(evt) ? '#58a6ff' : '#8b949e',
            }}>
              <input
                type="checkbox"
                checked={selectedEvents.includes(evt)}
                onChange={() => toggleEvent(evt)}
                style={{ accentColor: '#58a6ff' }}
              />
              {EVENT_LABELS[evt] || evt}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleAdd} style={{
            padding: '4px 12px', background: '#238636', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}>
            <FormattedMessage id="webhook.add" />
          </button>
          {message && <span style={{ color: '#d29922', fontSize: 11 }}>{message}</span>}
        </div>
      </div>

      {/* List */}
      {webhooks.length === 0 ? (
        <div style={{ color: '#8b949e', fontStyle: 'italic', padding: 8 }}>
          <FormattedMessage id="webhook.empty" />
        </div>
      ) : (
        webhooks.map((wh) => (
          <div key={wh.url} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 8px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 4,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#c9d1d9', fontSize: 12, wordBreak: 'break-all' }}>{wh.url}</div>
              <div style={{ color: '#8b949e', fontSize: 10, marginTop: 2 }}>
                {wh.events.map((e) => EVENT_LABELS[e] || e).join(', ')}
              </div>
            </div>
            <button onClick={() => handleDelete(wh.url)} style={{
              padding: '2px 8px', background: '#da3633', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginLeft: 8, whiteSpace: 'nowrap',
            }}>
              <FormattedMessage id="webhook.remove" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
