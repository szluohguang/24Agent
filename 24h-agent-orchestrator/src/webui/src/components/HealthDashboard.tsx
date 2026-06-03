import { useIntl } from 'react-intl'
import type { CometEngineState, CometPhase } from '../types'

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

const PHASE_COLORS: Record<CometPhase, string> = {
  open: '#58a6ff',
  design: '#d29922',
  build: '#f0883e',
  verify: '#238636',
  archive: '#8b949e',
}

export function HealthDashboard({ agents, stale, budget, cometState }: { agents: AgentHealthRow[]; stale: boolean; tasks?: { total: number; running: number }; budget?: { spent: number; limit: number }; cometState?: CometEngineState }) {
  const dedupedAgents = agents.filter((a, i, arr) => arr.findIndex((x) => x.taskId === a.taskId) === i)
  const budgetRatio = budget && budget.limit > 0 ? budget.spent / budget.limit : 0
  const budgetFilled = Math.round(budgetRatio * 10)
  const budgetBar = '█'.repeat(budgetFilled) + '░'.repeat(10 - budgetFilled)

  return (
    <div style={{ opacity: stale ? 0.5 : 1, transition: 'opacity 0.3s', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Comet 状态 — 置顶 */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #30363d' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', marginBottom: 6 }}>Comet</div>
        {!cometState || cometState.changeName === '(无活跃变更)' ? (
          <div style={{ fontSize: 12, color: '#8b949e', padding: '4px 0 8px' }}>
            无活跃变更。使用 /comet 开始新工作。
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
              <span style={{ color: '#c9d1d9' }}>{cometState.changeName}</span>
              <span style={{
                display: 'inline-block', fontSize: 10, padding: '1px 6px', borderRadius: 8, marginLeft: 6,
                background: cometState.workflow === 'hotfix' ? '#da3633' : cometState.workflow === 'tweak' ? '#d29922' : '#238636',
                color: '#fff', verticalAlign: 'middle',
              }}>{cometState.workflow}</span>
            </div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
              阶段: <span style={{ color: PHASE_COLORS[cometState.phase], fontWeight: 600 }}>{cometState.phase}</span>
            </div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              {( ['open', 'design', 'build', 'verify', 'archive'] as CometPhase[]).map((p, i) => {
                const ps = cometState.phases[p]
                const isActive = p === cometState.phase
                const isCompleted = ps?.status === 'completed'
                const isPending = ps?.status === 'pending'
                const dotColor = isCompleted ? '#238636' : isActive ? '#58a6ff' : '#30363d'
                return (
                  <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                      background: isPending ? 'transparent' : dotColor,
                      border: isPending ? '2px solid #30363d' : `2px solid ${dotColor}`,
                    }} />
                    <span style={{ color: isActive || isCompleted ? '#c9d1d9' : '#484f58' }}>{p}</span>
                    {i < 4 && <span style={{ color: '#30363d', fontSize: 8 }}>●</span>}
                  </span>
                )
              })}
            </div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
              Guard: <span style={{
                color: cometState.guardStatus === 'passed' ? '#238636' : cometState.guardStatus === 'failed' ? '#da3633' : cometState.guardStatus === 'running' ? '#58a6ff' : '#484f58',
                fontWeight: 600,
              }}>{cometState.guardStatus}</span>
            </div>
            {cometState.activeDecision && (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 4, padding: '6px 8px', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: '#d29922' }}>决策等待中: {cometState.activeDecision.prompt}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 预算单行 */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid #30363d', fontSize: 12, color: '#d29922', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        预算: ¥{budget?.spent.toFixed(2) ?? '0.00'} / ¥{budget?.limit.toFixed(2) ?? '0.00'}  {budgetBar}  {(budgetRatio * 100).toFixed(0)}%
      </div>

      {stale && (
        <div style={{ color: '#d29922', padding: '2px 12px', fontSize: 11 }}>
          健康数据过期
        </div>
      )}

      {/* Agent 列表 — 双滚动 */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Agent</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>状态</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>心跳</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>持续</th>
            </tr>
          </thead>
          <tbody>
            {dedupedAgents.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#8b949e' }}>暂无 Agent</td></tr>
            ) : dedupedAgents.map((agent) => {
              const color = HEALTH_COLORS[agent.healthStatus] || '#8b949e'
              return (
                <tr key={agent.sessionId || agent.taskId} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '6px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={agent.taskDescription || agent.taskId}>
                    <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'monospace' }}>[{agent.sessionId ? agent.sessionId.slice(0, 8) : '?'}]</span>{' '}
                    <span style={{ color: '#c9d1d9' }}>{agent.taskDescription || agent.taskId}</span>
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ color }}>{STATUS_ICONS[agent.healthStatus] || '○'} {agent.healthStatus}</span>
                  </td>
                  <td style={{ padding: '6px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}><RelativeTime ts={agent.lastHeartbeat} /></td>
                  <td style={{ padding: '6px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}><Duration ts={agent.startTime} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
