import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import type { CometEngineState, CometPhase, TaskNode } from '../types'

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

const HEALTH_LABELS: Record<string, string> = {
  healthy: '健康',
  suspected: '可疑',
  hung: '挂起',
  dead: '已停止',
}

const STATUS_ICONS: Record<string, string> = {
  healthy: '✓',
  suspected: '?',
  hung: '☉',
  dead: '✗',
}

const AGENT_STATUS_LABELS: Record<string, string> = {
  creating: '创建会话',
  running: '执行中',
  idle: '等待中',
  completed: '已结束',
  failed: '已失败',
  aborted: '已中止',
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

function getRootTaskId(taskId: string, tasks: TaskNode[]): string {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return taskId
  if (task.dependsOn.length === 0) return task.id
  return getRootTaskId(task.dependsOn[0], tasks)
}

const PHASE_ORDER: CometPhase[] = ['open', 'design', 'build', 'verify', 'archive']

const PHASE_LABELS: Record<string, string> = {
  open: '开启',
  design: '深度设计',
  build: '计划与构建',
  verify: '验证与收尾',
  archive: '归档',
}

const PHASE_COLORS: Record<string, string> = {
  open: '#58a6ff',
  design: '#d29922',
  build: '#f0883e',
  verify: '#238636',
  archive: '#8b949e',
}

const PHASE_SKILLS: Record<string, string> = {
  open: '/comet-open',
  design: '/comet-design',
  build: '/comet-build',
  verify: '/comet-verify',
  archive: '/comet-archive',
}

const GUARD_LABELS: Record<string, string> = {
  open: '开启',
  design: '设计完成',
  build: '构建完成',
  verify: '验证通过',
}

function GuardBadge({ status }: { status: 'idle' | 'running' | 'passed' | 'failed' }) {
  const color = status === 'passed' ? '#238636' : status === 'failed' ? '#da3633' : status === 'running' ? '#58a6ff' : '#30363d'
  const icon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : status === 'running' ? '⟳' : '○'
  return <span style={{ color, fontSize: 9 }}>{icon}</span>
}

function PhaseNode({ phase, label, status, isActive, isCompleted, guardStatus }: {
  phase: string
  label: string
  status: 'pending' | 'active' | 'completed' | string
  isActive: boolean
  isCompleted: boolean
  guardStatus?: 'idle' | 'running' | 'passed' | 'failed'
}) {
  const color = isCompleted ? '#238636' : isActive ? PHASE_COLORS[phase] : '#30363d'
  const bg = isCompleted ? '#23863622' : isActive ? PHASE_COLORS[phase] + '22' : 'transparent'
  const icon = isCompleted ? '✓' : isActive ? '●' : '○'
  const borderColor = isCompleted ? '#238636' : isActive ? PHASE_COLORS[phase] : '#30363d'

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginBottom: 0 }}>
      {/* Phase vertical line connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: isCompleted ? '#238636' : isActive ? PHASE_COLORS[phase] : 'transparent',
          border: `2px solid ${borderColor}`, flexShrink: 0,
        }} />
      </div>
      {/* Phase card */}
      <div style={{
        flex: 1, border: `1px solid ${borderColor}`, borderRadius: 6,
        background: bg, padding: '6px 8px', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <span style={{ color, fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 9, color: '#484f58', marginLeft: 'auto' }}>
            {PHASE_SKILLS[phase]}
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>
          {isCompleted ? '已完成' : isActive ? '进行中' : '待处理'}
          {guardStatus && (
            <span style={{ marginLeft: 6 }}>
              Guard: <GuardBadge status={guardStatus} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ConnectorLine({ passed, failed }: { passed?: boolean; failed?: boolean }) {
  const color = passed ? '#238636' : failed ? '#da3633' : '#30363d'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
      <div style={{ width: 2, height: 8, background: color }} />
      <div style={{ fontSize: 8, color }}>{passed ? '✓' : failed ? '✗' : '…'}</div>
      <div style={{ width: 2, height: 8, background: color }} />
    </div>
  )
}

export function HealthDashboard({ agents, tasks, stale, budget, cometState }: { agents: AgentHealthRow[]; tasks?: TaskNode[]; stale: boolean; budget?: { spent: number; limit: number }; cometState?: CometEngineState }) {
  const dedupedAgents = agents.filter((a, i, arr) => arr.findIndex((x) => x.taskId === a.taskId) === i)
  const budgetRatio = budget && budget.limit > 0 ? budget.spent / budget.limit : 0
  const budgetFilled = Math.round(budgetRatio * 10)
  const budgetBar = '█'.repeat(budgetFilled) + '░'.repeat(10 - budgetFilled)

  const groupedAgents = useMemo(() => {
    const groups = new Map<string, AgentHealthRow[]>()
    for (const a of dedupedAgents) {
      const rootId = tasks ? getRootTaskId(a.taskId, tasks) : a.taskId
      if (!groups.has(rootId)) groups.set(rootId, [])
      groups.get(rootId)!.push(a)
    }
    return groups
  }, [dedupedAgents, tasks])

  const rootTaskNames = useMemo(() => {
    const names = new Map<string, string>()
    if (!tasks) return names
    for (const t of tasks) {
      if (t.dependsOn.length === 0) {
        names.set(t.id, t.description)
      }
    }
    return names
  }, [tasks])

  // 各阶段对应的任务统计（来自 tasks.cometPhase）
  const phaseTaskMap = useMemo(() => {
    if (!tasks) return new Map<string, TaskNode[]>()
    const map = new Map<string, TaskNode[]>()
    for (const t of tasks) {
      if (t.cometPhase && PHASE_ORDER.includes(t.cometPhase as CometPhase)) {
        if (!map.has(t.cometPhase)) map.set(t.cometPhase, [])
        map.get(t.cometPhase)!.push(t)
      }
    }
    return map
  }, [tasks])

  return (
    <div style={{ opacity: stale ? 0.5 : 1, transition: 'opacity 0.3s', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Comet 状态 — 置顶 */}
      <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #30363d' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9', marginBottom: 6 }}>
          Comet
          <span style={{
            display: 'inline-block', fontSize: 8, padding: '1px 5px', borderRadius: 6, marginLeft: 4,
            background: '#1f6feb', color: '#fff', verticalAlign: 'middle', fontWeight: 500,
          }}>Eagle</span>
        </div>
        <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>
          模式: <span style={{ color: '#58a6ff', fontWeight: 600 }}>auto</span>
          <span style={{ marginLeft: 8 }}>技能: <span style={{ color: '#3fb950' }}>✓ 已加载</span></span>
        </div>
        {!cometState || cometState.changeName === '(无活跃变更)' ? (
          <div style={{ fontSize: 11, color: '#8b949e', padding: '2px 0 6px' }}>
            无活跃变更。使用 /comet 开始新工作。
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>
              <span style={{ color: '#c9d1d9', fontWeight: 500 }}>{cometState.changeName}</span>
              <span style={{
                display: 'inline-block', fontSize: 9, padding: '1px 5px', borderRadius: 6, marginLeft: 4,
                background: cometState.workflow === 'hotfix' ? '#da3633' : cometState.workflow === 'tweak' ? '#d29922' : '#238636',
                color: '#fff', verticalAlign: 'middle',
              }}>{cometState.workflow}</span>
            </div>

            {/* 状态机流程可视化（来自 Comet 引擎状态） */}
            <div style={{ marginTop: 6, marginBottom: 2 }}>
              {PHASE_ORDER.map((p, i) => {
                const ps = cometState.phases[p]
                const phaseStatus = ps?.status || 'pending'
                const isActive = p === cometState.phase
                const isCompleted = phaseStatus === 'completed'

                return (
                  <div key={p}>
                    <PhaseNode
                      phase={p}
                      label={PHASE_LABELS[p]}
                      status={phaseStatus}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      guardStatus={i > 0 && isCompleted ? undefined : undefined}
                    />
                    {i < PHASE_ORDER.length - 1 && (
                      <ConnectorLine
                        passed={isCompleted}
                        failed={false}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* 各阶段任务统计 */}
            {phaseTaskMap.size > 0 && (
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {PHASE_ORDER.map(p => {
                  const tasksInPhase = phaseTaskMap.get(p)
                  if (!tasksInPhase || tasksInPhase.length === 0) return null
                  const isActive = p === cometState.phase
                  const hasCompleted = tasksInPhase.some(t => t.status === 'completed')
                  const count = tasksInPhase.length
                  return (
                    <span key={p} style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4,
                      background: isActive ? PHASE_COLORS[p] + '22' : '#161b22',
                      border: `1px solid ${isActive ? PHASE_COLORS[p] : '#30363d'}`,
                      color: isActive || hasCompleted ? '#c9d1d9' : '#484f58',
                    }}>
                      {PHASE_LABELS[p].slice(0, 2)}:{count}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Guard 状态 */}
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
              Guard: <span style={{
                color: cometState.guardStatus === 'passed' ? '#238636' : cometState.guardStatus === 'failed' ? '#da3633' : cometState.guardStatus === 'running' ? '#58a6ff' : '#484f58',
                fontWeight: 600,
              }}>
                {cometState.guardStatus === 'passed' ? '✓ 通过' : cometState.guardStatus === 'failed' ? '✗ 失败' : cometState.guardStatus === 'running' ? '⟳ 执行中' : '○ 等待'}
              </span>
            </div>

            {cometState.activeDecision && (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 4, padding: '5px 7px', marginTop: 4 }}>
                <div style={{ fontSize: 10, color: '#d29922' }}>⚡ {cometState.activeDecision.prompt}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {cometState.activeDecision.options.map((opt, i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 3,
                      background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d',
                    }}>{opt.label}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 预算单行 */}
      <div style={{ padding: '5px 12px', borderBottom: '1px solid #30363d', fontSize: 11, color: '#d29922', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        预算: ¥{budget?.spent.toFixed(2) ?? '0.00'} / ¥{budget?.limit.toFixed(2) ?? '0.00'}  {budgetBar}  {(budgetRatio * 100).toFixed(0)}%
      </div>

      {stale && (
        <div style={{ color: '#d29922', padding: '2px 12px', fontSize: 11 }}>
          健康数据过期
        </div>
      )}

      {/* Agent 列表 — 按任务分组 */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {dedupedAgents.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#8b949e', fontSize: 11 }}>暂无 Agent</div>
        ) : (
          [...groupedAgents.entries()].map(([rootId, groupAgents]) => {
            const rootName = rootTaskNames.get(rootId)
            return (
              <div key={rootId} style={{ borderBottom: '1px solid #21262d' }}>
                <div style={{
                  padding: '5px 10px', fontSize: 10, fontWeight: 600, color: '#8b949e',
                  background: '#161b22', borderBottom: '1px solid #21262d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={rootName || rootId}>
                  {rootName || rootId}
                </div>
                {groupAgents.map((agent) => {
                  const color = HEALTH_COLORS[agent.healthStatus] || '#8b949e'
                  return (
                    <div key={agent.sessionId || agent.taskId} style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                      fontSize: 10, borderBottom: '1px solid #21262d',
                    }}>
                      <span style={{ fontSize: 9, color: '#8b949e', fontFamily: 'monospace', minWidth: 54 }}>
                        [{agent.sessionId ? agent.sessionId.slice(0, 8) : '?'}]
                      </span>
                      <span style={{ color, fontSize: 9, minWidth: 36 }}>
                        {STATUS_ICONS[agent.healthStatus] || '○'} {HEALTH_LABELS[agent.healthStatus] || agent.healthStatus}
                      </span>
                      <span style={{ color: '#58a6ff', fontSize: 9, minWidth: 40 }}>
                        {AGENT_STATUS_LABELS[agent.status] || agent.status}
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: 9 }}>
                        <RelativeTime ts={agent.lastHeartbeat} />
                      </span>
                      <span style={{ color: '#484f58', fontSize: 9, minWidth: 36, textAlign: 'right' }}>
                        <Duration ts={agent.startTime} />
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
