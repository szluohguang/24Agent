import { useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { SystemOverview } from './SystemOverview'

interface AgentHealthRow {
  sessionId: string
  taskId: string
  status: string
  healthStatus: string
  lastHeartbeat: number
  startTime: number
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#238636',
  suspected: '#d29922',
  hung: '#f0883e',
  dead: '#da3633',
}

const STATUS_ICONS: Record<string, string> = {
  healthy: '✓',
  suspected: '?',
  hung: '☉',
  dead: '✗',
}

function RelativeTime({ ts }: { ts: number }) {
  const intl = useIntl()
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 5) return <>{intl.formatMessage({ id: 'health.justNow' })}</>
  if (sec < 60) return <>{intl.formatMessage({ id: 'health.secAgo' }, { sec })}</>
  const min = Math.floor(sec / 60)
  return <>{intl.formatMessage({ id: 'health.minAgo' }, { min })}</>
}

function Duration({ ts }: { ts: number }) {
  const intl = useIntl()
  const sec = Math.floor((Date.now() - ts) / 1000)
  const min = Math.floor(sec / 60)
  const hrs = Math.floor(min / 60)
  if (hrs > 0) return <>{intl.formatMessage({ id: 'health.hrMin' }, { hrs, min: min % 60 })}</>
  return <>{intl.formatMessage({ id: 'health.minSec' }, { min, sec: sec % 60 })}</>
}

export function HealthDashboard({ agents, stale }: { agents: AgentHealthRow[]; stale: boolean }) {
  return (
    <div style={{ opacity: stale ? 0.5 : 1, transition: 'opacity 0.3s' }}>
      <SystemOverview data={{
        agents: { active: agents.filter((a) => a.healthStatus === 'healthy').length, total: agents.length },
        tasks: { total: 0, running: 0, failed: agents.filter((a) => a.healthStatus === 'dead').length },
      }} />
      {stale && (
        <div style={{ color: '#d29922', padding: '4px 12px', fontSize: 12 }}>
          <FormattedMessage id="health.stale" />
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="health.agent" /></th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="health.status" /></th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="health.heartbeat" /></th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}><FormattedMessage id="health.duration" /></th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#8b949e' }}><FormattedMessage id="health.noAgents" /></td></tr>
            ) : agents.map((agent) => {
              const color = HEALTH_COLORS[agent.healthStatus] || '#8b949e'
              return (
                <tr key={agent.sessionId || agent.taskId} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                    {agent.sessionId ? agent.sessionId.slice(0, 8) : '?'} <span style={{ color: '#8b949e' }}>({agent.taskId})</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color }}>{STATUS_ICONS[agent.healthStatus] || '○'} {agent.healthStatus}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#8b949e' }}><RelativeTime ts={agent.lastHeartbeat} /></td>
                  <td style={{ padding: '8px 12px', color: '#8b949e' }}><Duration ts={agent.startTime} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
