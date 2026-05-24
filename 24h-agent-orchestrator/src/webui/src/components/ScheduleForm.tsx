import { useState } from 'react'
import { FormattedMessage } from 'react-intl'

interface ScheduleFormData {
  description: string
  cronExpr: string
  permission: 'trusted' | 'safe' | 'strict'
  budget: number
  maxRetries: number
}

export function ScheduleForm({ onSubmit, initial }: { onSubmit: (data: ScheduleFormData) => void; initial?: ScheduleFormData }) {
  const [desc, setDesc] = useState(initial?.description || '')
  const [cron, setCron] = useState(initial?.cronExpr || '')
  const [perm, setPerm] = useState(initial?.permission || 'safe')
  const [budget, setBudget] = useState(initial?.budget || 0)
  const [retries, setRetries] = useState(initial?.maxRetries || 3)
  const [preview, setPreview] = useState<string[]>([])

  const computePreview = (expr: string) => {
    if (!expr.trim()) { setPreview([]); return }
    try {
      // simple cron preview: just show the expression
      setPreview([`Next: ${expr}`])
    } catch {
      setPreview([])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ description: desc, cronExpr: cron, permission: perm, budget, maxRetries: retries })
    if (!initial) { setDesc(''); setCron('') }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      <input
        value={desc} onChange={(e) => setDesc(e.target.value)}
        placeholder="Task description"
        style={inputStyle}
      />
      <input
        value={cron} onChange={(e) => { setCron(e.target.value); computePreview(e.target.value) }}
        placeholder="Cron expression (e.g., 0 9 * * 1)"
        style={{ ...inputStyle, fontFamily: 'monospace' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={perm} onChange={(e) => setPerm(e.target.value as typeof perm)} style={selectStyle}>
          <option value="trusted">Trusted</option>
          <option value="safe">Safe</option>
          <option value="strict">Strict</option>
        </select>
        <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} placeholder="Budget" style={{ ...inputStyle, width: 100 }} />
        <input type="number" value={retries} onChange={(e) => setRetries(Number(e.target.value))} placeholder="Max retries" style={{ ...inputStyle, width: 100 }} />
      </div>
      {preview.length > 0 && (
        <div style={{ fontSize: 12, color: '#8b949e' }}>
          {preview.map((p, i) => <div key={i}>{p}</div>)}
        </div>
      )}
      <button type="submit" style={btnStyle}>
        {initial ? 'Update' : 'Create'}
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '8px 12px',
  color: '#c9d1d9', fontSize: 13,
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}

const btnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px',
  cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start',
}
