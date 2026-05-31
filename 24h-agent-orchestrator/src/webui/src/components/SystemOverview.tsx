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
      <BudgetCard budget={data.budget} />
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

function BudgetCard({ budget }: { budget?: { spent: number; limit: number } }) {
  if (!budget) {
    return <Card label={<FormattedMessage id="health.budget" />} value="$0" color="#d29922" />
  }
  const ratio = budget.limit > 0 ? budget.spent / budget.limit : 0
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 16px', minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
        <FormattedMessage id="health.budget" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#d29922', marginBottom: 6 }}>
        ¥{budget.spent.toFixed(2)}
      </div>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>
        <FormattedMessage id="health.budgetLimit" values={{ limit: budget.limit.toFixed(2) }} />
      </div>
      <div style={{ height: 4, background: '#30363d', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(ratio * 100, 100)}%`, height: '100%', background: ratio > 0.8 ? '#da3633' : '#d29922', borderRadius: 2 }} />
      </div>
    </div>
  )
}
