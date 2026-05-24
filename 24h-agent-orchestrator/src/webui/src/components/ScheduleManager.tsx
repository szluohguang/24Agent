import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { ScheduleForm } from './ScheduleForm'

interface ScheduleItem {
  id: string
  description: string
  cronExpr: string
  permission: string
  budget: number
  maxRetries: number
  enabled: boolean
  lastTriggered: number
}

export function ScheduleManager() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const loadSchedules = async () => {
    try {
      const res = await fetch('/api/schedule')
      if (res.ok) setSchedules(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => { loadSchedules() }, [])

  const handleCreate = async (data: { description: string; cronExpr: string; permission: string; budget: number; maxRetries: number }) => {
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setShowForm(false)
    loadSchedules()
  }

  const handleToggle = async (item: ScheduleItem) => {
    await fetch(`/api/schedule/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !item.enabled }),
    })
    loadSchedules()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
    loadSchedules()
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}><FormattedMessage id="schedule.title" /></h3>
        <button onClick={() => { setShowForm(!showForm); setEditId(null) }} style={addBtnStyle}>
          + <FormattedMessage id="schedule.create" />
        </button>
      </div>

      {showForm && <ScheduleForm onSubmit={editId ? (d) => {} : handleCreate} />}

      {schedules.length === 0 ? (
        <div style={{ color: '#8b949e', textAlign: 'center', padding: 24 }}>
          <FormattedMessage id="schedule.noSchedules" />
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="app.tasks" /></th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="schedule.cron" /></th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Enabled</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="schedule.lastRun" /></th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #21262d' }}>
                <td style={{ padding: '8px 12px' }}>{s.description}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{s.cronExpr}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggle(s)}
                    style={{
                      background: s.enabled ? '#238636' : '#21262d',
                      color: s.enabled ? '#fff' : '#8b949e',
                      border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    {s.enabled ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td style={{ padding: '8px 12px', color: '#8b949e' }}>
                  {s.lastTriggered ? new Date(s.lastTriggered).toLocaleString() : '-'}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => handleDelete(s.id)} style={delBtnStyle}>
                    <FormattedMessage id="schedule.delete" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const addBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px',
  cursor: 'pointer', fontWeight: 600, fontSize: 13,
}

const delBtnStyle: React.CSSProperties = {
  background: 'transparent', color: '#da3633', border: '1px solid #da3633', borderRadius: 4,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12,
}
