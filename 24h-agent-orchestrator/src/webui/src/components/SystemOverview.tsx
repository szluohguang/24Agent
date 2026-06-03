import { FormattedMessage } from 'react-intl'

interface OverviewData {
  agents: { active: number; total: number }
  tasks: { total: number; running: number; failed: number }
  budget?: { spent: number; limit: number }
}

export function SystemOverview({ data }: { data?: OverviewData }) {
  if (!data) {
    return (
      <div style={{ padding: 12, color: '#888' }}>
        <FormattedMessage id="health.stale" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 12, flexWrap: 'wrap' }}>
      <Card label={<FormattedMessage id="health.active" />} value={data.agents.active} color="#238636" />
      <Card label={<FormattedMessage id="health.status" />} value={`${data.agents.active}/${data.agents.total}`} color="#58a6ff" />
      <Card label={<FormattedMessage id="app.tasks" />} value={`${data.tasks.total}`} color="#58a6ff" />
      <Card label={<FormattedMessage id="health.retries" />} value={data.tasks.failed} color="#da3633" />
      <BudgetLine budget={data.budget} />
    </div>
  )
}

function Card({ label, value, color }: { label: React.ReactNode; value: React.ReactNode; color: string }) {
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 24px', minWidth: 140,
    }}>
      <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function BudgetLine({ budget }: { budget?: { spent: number; limit: number } }) {
  if (!budget) {
    return <span style={{ fontSize: 12, color: '#8b949e' }}>预算: ¥0 / ¥0</span>
  }
  const ratio = budget.limit > 0 ? budget.spent / budget.limit : 0
  const filled = Math.round(ratio * 10)
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
  return (
    <span style={{ fontSize: 12, color: '#d29922', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
      预算: ¥{budget.spent.toFixed(2)} / ¥{budget.limit.toFixed(2)}  {bar}  {(ratio * 100).toFixed(0)}%
    </span>
  )
}
