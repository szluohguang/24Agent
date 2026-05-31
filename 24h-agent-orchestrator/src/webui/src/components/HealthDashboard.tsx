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
  taskDescription?: string
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

export function HealthDashboard({ agents, stale, tasks, budget }: { agents: AgentHealthRow[]; stale: boolean; tasks?: { total: number; running: number }; budget?: { spent: number; limit: number } }) {
  const dedupedAgents = agents.filter((a, i, arr) => arr.findIndex((x) => x.taskId === a.taskId) === i)
  return (
    <div style={{ opacity: stale ? 0.5 : 1, transition: 'opacity 0.3s' }}>
      <SystemOverview data={{
        agents: { active: dedupedAgents.filter((a) => a.healthStatus === 'healthy').length, total: dedupedAgents.length },
        tasks: { total: tasks?.total ?? 0, running: tasks?.running ?? 0, failed: dedupedAgents.filter((a) => a.healthStatus === 'dead').length },
        budget,
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
            {dedupedAgents.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#8b949e' }}><FormattedMessage id="health.noAgents" /></td></tr>
            ) : dedupedAgents.map((agent) => {
              const color = HEALTH_COLORS[agent.healthStatus] || '#8b949e'
              return (
                <tr key={agent.sessionId || agent.taskId} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '8px 12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={agent.taskDescription || agent.taskId}>
                    <span style={{ fontSize: 11, color: '#8b949e', fontFamily: 'monospace' }}>[{agent.sessionId ? agent.sessionId.slice(0, 8) : '?'}]</span>{' '}
                    <span style={{ color: '#c9d1d9' }}>{agent.taskDescription || agent.taskId}</span>
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
