import React, { useRef, useState, useMemo } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type { TaskNode, TaskStatus, CometEngineState } from '../types.js'

interface AgentInfo {
  sessionId: string
  taskId: string
  healthStatus: string
  lastHeartbeat: number
  startTime: number
}

interface TreeViewProps {
  tasks: TaskNode[]
  agents: AgentInfo[]
  selectedTaskId?: string
  onDispatch: (taskId: string) => void
  onAbort: (taskId: string) => void
  onSelect: (taskId: string) => void
  onDelete: (taskId: string) => void
  cometState?: CometEngineState
}

const ACTIVE_STATUSES: Set<TaskStatus> = new Set(['pending', 'running', 'awaiting_review', 'queued', 'retrying', 'scheduled'])
const COMPLETED_STATUSES: Set<TaskStatus> = new Set(['completed', 'failed', 'rejected'])

const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: '○', running: '●', completed: '✓', failed: '✗', scheduled: '◷',
  queued: '◌', retrying: '⟳', awaiting_review: '◉', rejected: '✕',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#8b949e', running: '#58a6ff', completed: '#3fb950', failed: '#f85149',
  scheduled: '#d29922', queued: '#8b949e', retrying: '#f0883e', awaiting_review: '#d29922', rejected: '#f85149',
}

const PHASE_ORDER = ['open', 'design', 'build', 'verify', 'archive'] as const
const PHASE_LABELS: Record<string, string> = {
  open: '开启', design: '深度设计', build: '计划与构建',
  verify: '验证与收尾', archive: '归档',
}
const PHASE_STATUS_COLORS: Record<string, string> = { completed: '#238636', active: '#58a6ff', pending: '#484f58' }
const PHASE_STATUS_ICONS: Record<string, string> = { completed: '✓', active: '●', pending: '○' }
const WORKFLOW_LABELS: Record<string, string> = { full: '完整流程', hotfix: 'hotfix', tweak: 'tweak' }

const DIALOG_OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const DIALOG_BOX: React.CSSProperties = { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 24, maxWidth: 420 }

const btnBase = { padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 } as const
const dispatchBtnStyle: React.CSSProperties = { ...btnBase, background: '#238636', color: '#fff', border: 'none' }
const abortBtnStyle: React.CSSProperties = { ...btnBase, background: '#da3633', color: '#fff', border: 'none' }
const deleteBtnStyle: React.CSSProperties = { ...btnBase, background: '#484f58', color: '#8b949e', border: '1px solid #30363d' }

function handleDeleteClick(task: TaskNode, onDelete: (id: string) => void, setConfirmDeleteId: (id: string | null) => void) {
  if (task.status === 'running') {
    setConfirmDeleteId(task.id)
  } else {
    onDelete(task.id)
  }
}

function phaseBg(status?: string, isActive?: boolean): string {
  if (status === 'active') return '#1c2333'
  if (status === 'completed') return '#162216'
  return '#0d1117'
}

function AgentItem({ agent }: { agent: AgentInfo }) {
  const color = agent.healthStatus === 'healthy' ? '#3fb950' : agent.healthStatus === 'dead' ? '#f85149' : '#d29922'
  const icon = agent.healthStatus === 'healthy' ? '✓' : agent.healthStatus === 'suspected' ? '?' : agent.healthStatus === 'hung' ? '☉' : '✗'
  return (
    <div style={{
      padding: '4px 10px 4px 16px', margin: '2px 0 2px 20px', borderRadius: 4,
      background: '#0d1117', border: '1px solid #21262d', fontSize: 12,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ color, fontWeight: 'bold' }}>⊞</span>
      <span style={{ fontFamily: 'monospace', color: '#8b949e' }}>[{agent.sessionId.slice(0, 8)}]</span>
      <span style={{ color }}>{icon} {agent.healthStatus}</span>
      <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: 11 }}>
        {new Date(agent.startTime).toLocaleTimeString()}
      </span>
    </div>
  )
}

function TaskItem({ task, agent, isSelected, isHovered, onSelect, onDispatch, onAbort, onDelete, hoveredBtnId, setHoveredBtnId, setConfirmDeleteId, hasAgents, showAgents, onToggleAgents, children }: {
  task: TaskNode; agent?: AgentInfo; isSelected: boolean; isHovered: boolean
  onSelect: (id: string) => void; onDispatch: (id: string) => void; onAbort: (id: string) => void; onDelete: (id: string) => void
  hoveredBtnId: string | null; setHoveredBtnId: (id: string | null) => void; setConfirmDeleteId: (id: string | null) => void
  hasAgents: boolean; showAgents: boolean; onToggleAgents: () => void; children?: React.ReactNode
}) {
  const intl = useIntl()
  const dId = `dispatch-${task.id}`
  const aId = `abort-${task.id}`
  const delId = `delete-${task.id}`

  return (
    <div>
      <div
        onClick={() => onSelect(task.id)}
        style={{
          padding: '8px 12px', margin: '4px 0', borderRadius: 6,
          background: isSelected ? '#1f2937' : '#161b22',
          border: isHovered || isSelected ? '1px solid #58a6ff' : '1px solid #30363d',
          fontSize: 13, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: STATUS_COLORS[task.status], fontWeight: 'bold' }}>{STATUS_ICONS[task.status]}</span>
          <span style={{ flex: 1 }}>{task.description}</span>
          {task.status === 'retrying' && task.retryCount !== undefined && (
            <span style={{ background: '#f0883e33', color: '#f0883e', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
              <FormattedMessage id="treeview.retry" values={{ n: task.retryCount, m: task.maxRetries ?? 10 }} />
            </span>
          )}
          <span style={{ color: STATUS_COLORS[task.status], fontSize: 11 }}>
            {intl.formatMessage({ id: 'task.status.' + task.status })}
          </span>
        </div>
        {agent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11 }}>
            <span style={{ fontFamily: 'monospace', color: '#8b949e' }}>[{agent.sessionId.slice(0, 8)}]</span>
            <span style={{ color: agent.healthStatus === 'healthy' ? '#3fb950' : agent.healthStatus === 'dead' ? '#f85149' : '#d29922' }}>
              {agent.healthStatus === 'healthy' ? '✓' : agent.healthStatus === 'suspected' ? '?' : agent.healthStatus === 'hung' ? '☉' : '✗'} {agent.healthStatus}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
          {(task.status === 'pending' || task.status === 'rejected') && (
            <button onClick={(e) => { e.stopPropagation(); onDispatch(task.id) }} onMouseEnter={() => setHoveredBtnId(dId)} onMouseLeave={() => setHoveredBtnId(null)}
              style={{ ...dispatchBtnStyle, border: '1px solid', borderColor: hoveredBtnId === dId ? '#3fb950' : 'transparent', transition: 'border-color 0.15s' }}>
              <FormattedMessage id="task.dispatch" />
            </button>
          )}
          {task.status === 'running' && (
            <button onClick={(e) => { e.stopPropagation(); onAbort(task.id) }} onMouseEnter={() => setHoveredBtnId(aId)} onMouseLeave={() => setHoveredBtnId(null)}
              style={{ ...abortBtnStyle, border: '1px solid', borderColor: hoveredBtnId === aId ? '#f85149' : 'transparent', transition: 'border-color 0.15s' }}>
              <FormattedMessage id="task.abort" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(task, onDelete, setConfirmDeleteId) }}
            onMouseEnter={() => setHoveredBtnId(delId)} onMouseLeave={() => setHoveredBtnId(null)}
            style={{ ...deleteBtnStyle, marginLeft: 'auto', borderColor: hoveredBtnId === delId ? '#da3633' : '#30363d', transition: 'border-color 0.15s' }}
            title={intl.formatMessage({ id: 'task.delete' })}>
            <FormattedMessage id="task.delete" />
          </button>
        </div>
        {task.dependsOn.length > 0 && (
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
            <FormattedMessage id="treeview.depends" values={{ tasks: task.dependsOn.join(', ') }} />
          </div>
        )}
        {hasAgents && (
          <div style={{ marginTop: 4 }}>
            <span onClick={(e) => { e.stopPropagation(); onToggleAgents() }}
              style={{ fontSize: 11, color: '#58a6ff', cursor: 'pointer', userSelect: 'none' }}>
              {showAgents ? '▼ 收起子 Agent' : `▶ ${children ? React.Children.count(children) : 0} 个子 Agent`}
            </span>
          </div>
        )}
      </div>
      {hasAgents && showAgents && children}
    </div>
  )
}

interface ChangeRootNodeProps {
  cometState: CometEngineState
  children: React.ReactNode
}

function ChangeRootNode({ cometState, children }: ChangeRootNodeProps) {
  const [expanded, setExpanded] = useState(true)

  const currentPhase = cometState.phase
  const phaseLabel = PHASE_LABELS[currentPhase] || currentPhase
  const workflowLabel = WORKFLOW_LABELS[cometState.workflow] || cometState.workflow
  const phaseStatus = cometState.phases[currentPhase]
  const isPhaseActive = phaseStatus?.status === 'active'
  const progress = phaseStatus?.progress ?? 0

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: '#1c2333',
          border: '1px solid #d29922',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#c9d1d9', fontWeight: 'bold', fontSize: 13 }}>
            {expanded ? '▼' : '▶'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#c9d1d9' }}>
            {cometState.changeName || '(无活跃变更)'}
          </span>
          <span style={{
            fontSize: 11,
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 10,
            padding: '2px 8px',
            color: '#8b949e',
          }}>
            {phaseLabel} · {workflowLabel}
          </span>
          {isPhaseActive && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#58a6ff' }}>
              {progress}%
            </span>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{
          padding: '2px 0 2px 8px',
          borderLeft: '2px solid #d29922',
          marginLeft: 6,
          marginTop: 2,
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function PhaseNode({ phase, state, tasks, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete, hoveredBtnId, setHoveredBtnId, confirmDeleteId, setConfirmDeleteId }: {
  phase: string; state: { status: string; progress: number } | undefined
  tasks: TaskNode[]; agents: AgentInfo[]; selectedTaskId?: string
  onDispatch: (id: string) => void; onAbort: (id: string) => void; onSelect: (id: string) => void; onDelete: (id: string) => void
  hoveredBtnId: string | null; setHoveredBtnId: (id: string | null) => void
  confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [expandedAgentTasks, setExpandedAgentTasks] = useState<Set<string>>(new Set())
  const ps = state
  const isActive = ps?.status === 'active'
  const isCompleted = ps?.status === 'completed'
  const color = PHASE_STATUS_COLORS[ps?.status || 'pending']
  const icon = PHASE_STATUS_ICONS[ps?.status || 'pending']

  const activeTs = tasks.filter(t => ACTIVE_STATUSES.has(t.status) || t.status === 'pending')
  const completedTs = tasks.filter(t => COMPLETED_STATUSES.has(t.status))

  const hasContent = tasks.length > 0

  const toggleAgent = (taskId: string) => {
    setExpandedAgentTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '10px 12px', borderRadius: 6,
          background: isActive ? '#1c2333' : isCompleted ? '#162216' : '#0d1117',
          border: `1px solid ${isActive ? '#58a6ff' : '#21262d'}`,
          cursor: 'pointer', userSelect: 'none',
          opacity: ps?.status === 'pending' ? 0.5 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color, fontWeight: 'bold', fontSize: 13 }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ color, fontWeight: 'bold', fontSize: 14 }}>{icon}</span>
          <span style={{ fontWeight: isActive ? 'bold' : 'normal', fontSize: 13, color: '#c9d1d9' }}>
            {PHASE_LABELS[phase] || phase}
          </span>
          {hasContent && (
            <span style={{ marginLeft: 4, fontSize: 11, color: '#8b949e' }}>
              ({activeTs.length + completedTs.length})
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: '#8b949e', fontSize: 12 }}>
            {isCompleted ? '已完成' : isActive ? `${ps?.progress || 0}%` : ''}
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '4px 0 4px 12px', borderLeft: '1px solid #21262d', marginLeft: 6, marginTop: 2 }}>
          {activeTs.length > 0 && (
            <>
              <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#58a6ff' }}>
                进行中 ({activeTs.length})
              </div>
              {activeTs.map(t => renderTaskNode(t, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete, hoveredBtnId, setHoveredBtnId, confirmDeleteId, setConfirmDeleteId, expandedAgentTasks, toggleAgent))}
            </>
          )}
          {completedTs.length > 0 && (
            <>
              <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#8b949e', marginTop: 4 }}>
                已完成 ({completedTs.length})
              </div>
              {completedTs.map(t => renderTaskNode(t, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete, hoveredBtnId, setHoveredBtnId, confirmDeleteId, setConfirmDeleteId, expandedAgentTasks, toggleAgent))}
            </>
          )}
          {!hasContent && (
            <div style={{ padding: '8px', fontSize: 12, color: '#484f58' }}>暂无任务</div>
          )}
        </div>
      )}
    </div>
  )
}

function renderTaskNode(
  task: TaskNode, agents: AgentInfo[], selectedTaskId?: string,
  onDispatch: (id: string) => void, onAbort: (id: string) => void,
  onSelect: (id: string) => void, onDelete: (id: string) => void,
  hoveredBtnId: string | null, setHoveredBtnId: (id: string | null) => void,
  confirmDeleteId: string | null, setConfirmDeleteId: (id: string | null) => void,
  expandedAgentTasks: Set<string>, toggleAgent: (taskId: string) => void,
) {
  const taskAgents = agents.filter(a => a.taskId === task.id)
  const hasAgents = taskAgents.length > 0
  const showAgents = expandedAgentTasks.has(task.id)

  return (
    <TaskItem key={task.id} task={task}
      agent={task.sessionId ? agents.find(a => a.sessionId === task.sessionId) : undefined}
      isSelected={task.id === selectedTaskId} isHovered={false}
      onSelect={onSelect} onDispatch={onDispatch} onAbort={onAbort} onDelete={onDelete}
      hoveredBtnId={hoveredBtnId} setHoveredBtnId={setHoveredBtnId} setConfirmDeleteId={setConfirmDeleteId}
      hasAgents={hasAgents} showAgents={showAgents} onToggleAgents={() => toggleAgent(task.id)}
    >
      {hasAgents && showAgents && taskAgents.map(a => (
        <AgentItem key={a.sessionId} agent={a} />
      ))}
    </TaskItem>
  )
}

function renderFlatTask(
  task: TaskNode, agents: AgentInfo[], selectedTaskId?: string,
  onDispatch: (id: string) => void, onAbort: (id: string) => void,
  onSelect: (id: string) => void, onDelete: (id: string) => void,
  hoveredBtnId: string | null, setHoveredBtnId: (id: string | null) => void,
  setConfirmDeleteId: (id: string | null) => void, expandedAgentTasks: Set<string>, toggleAgent: (taskId: string) => void,
) {
  const agent = task.sessionId ? agents.find(a => a.sessionId === task.sessionId) : undefined
  const taskAgents = agents.filter(a => a.taskId === task.id && a.sessionId !== task.sessionId)
  const hasAgents = taskAgents.length > 0
  const showAgents = expandedAgentTasks.has(task.id)

  return (
    <TaskItem key={task.id} task={task}
      agent={agent}
      isSelected={task.id === selectedTaskId} isHovered={false}
      onSelect={onSelect} onDispatch={onDispatch} onAbort={onAbort} onDelete={onDelete}
      hoveredBtnId={hoveredBtnId} setHoveredBtnId={setHoveredBtnId} setConfirmDeleteId={setConfirmDeleteId}
      hasAgents={hasAgents} showAgents={showAgents} onToggleAgents={() => toggleAgent(task.id)}
    >
      {hasAgents && showAgents && taskAgents.map(a => (
        <AgentItem key={a.sessionId} agent={a} />
      ))}
    </TaskItem>
  )
}

export function TreeView({ tasks, agents, selectedTaskId, onDispatch, onAbort, onDelete, onSelect, cometState }: TreeViewProps) {
  const intl = useIntl()
  const [hoveredBtnId, setHoveredBtnId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [expandedAgentTasks, setExpandedAgentTasks] = useState<Set<string>>(new Set())
  const [dividerPos, setDividerPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleAgent = (taskId: string) => {
    setExpandedAgentTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const activeTasks = useMemo(() => tasks.filter(t => ACTIVE_STATUSES.has(t.status)), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => COMPLETED_STATUSES.has(t.status)), [tasks])
  const taskMap = useMemo(() => {
    const map = new Map<string, TaskNode[]>()
    for (const t of tasks) {
      for (const depId of t.dependsOn) {
        if (!map.has(depId)) map.set(depId, [])
        map.get(depId)!.push(t)
      }
    }
    return map
  }, [tasks])

  if (cometState) {
    // 无任务时显示空状态
    if (tasks.length === 0) {
      return <div style={{ padding: 16, color: '#8b949e', fontSize: 13 }}>暂无任务，输入描述创建新任务</div>
    }

    const rootTasks = tasks.filter(t => t.dependsOn.length === 0)

    const renderTaskWithChildren = (task: TaskNode, depth: number = 0): React.ReactNode => {
      const children = taskMap.get(task.id) || []
      return (
        <div key={task.id}>
          <div style={{ marginLeft: depth * 16 }}>
            {renderFlatTask(task, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete, hoveredBtnId, setHoveredBtnId, setConfirmDeleteId, expandedAgentTasks, toggleAgent)}
          </div>
          {children.length > 0 && (
            <div style={{ marginLeft: depth * 16 + 16 }}>
              {children.map(child => renderTaskWithChildren(child, 0))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ padding: 8, overflow: 'auto', height: '100%' }}>
        {confirmDeleteId && (
          <div style={DIALOG_OVERLAY} onClick={() => setConfirmDeleteId(null)}>
            <div style={DIALOG_BOX} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, color: '#c9d1d9', marginBottom: 16 }}>
                <FormattedMessage id="dialog.confirmDeleteRunning" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 16px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  <FormattedMessage id="dialog.cancel" />
                </button>
                <button onClick={() => { const r = confirmDeleteId; const t = tasks.find(t2 => t2.id === r); if (r && t?.status === 'running') onAbort(r); if (r) onDelete(r); setConfirmDeleteId(null) }}
                  style={{ padding: '6px 16px', background: '#da3633', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  <FormattedMessage id="dialog.confirm" />
                </button>
              </div>
            </div>
          </div>
        )}
        {rootTasks.map(task => renderTaskWithChildren(task, 0))}
      </div>
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const controller = new AbortController()
    const handleMouseMove = (ev: MouseEvent) => {
      const yInContainer = ev.clientY - rect.top
      const pct = (yInContainer / rect.height) * 100
      setDividerPos(Math.max(20, Math.min(80, pct)))
    }
    const handleMouseUp = () => {
      setDragging(false)
      controller.abort()
    }
    window.addEventListener('mousemove', handleMouseMove, { signal: controller.signal })
    window.addEventListener('mouseup', handleMouseUp, { signal: controller.signal })
  }

  if (tasks.length === 0) {
    return <div style={{ padding: 16, color: '#8b949e' }}><FormattedMessage id="app.noTasks" /></div>
  }

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {confirmDeleteId && (
        <div style={DIALOG_OVERLAY} onClick={() => setConfirmDeleteId(null)}>
          <div style={DIALOG_BOX} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, color: '#c9d1d9', marginBottom: 16 }}>
              <FormattedMessage id="dialog.confirmDeleteRunning" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 16px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                <FormattedMessage id="dialog.cancel" />
              </button>
              <button onClick={() => { if (confirmDeleteId) { const t = tasks.find(t2 => t2.id === confirmDeleteId); if (t?.status === 'running') onAbort(confirmDeleteId); onDelete(confirmDeleteId) } setConfirmDeleteId(null) }}
                style={{ padding: '6px 16px', background: '#da3633', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                <FormattedMessage id="dialog.confirm" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: `${dividerPos}`, overflow: 'auto', minHeight: 60 }}>
        <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#58a6ff', borderBottom: '1px solid #21262d' }}>
          <FormattedMessage id="treeview.active" />
        </div>
        {activeTasks.length === 0 ? (
          <div style={{ padding: 16, color: '#8b949e', fontSize: 12 }}><FormattedMessage id="treeview.noActive" /></div>
        ) : (
          <div style={{ padding: 8 }}>
            {activeTasks.map(t => renderFlatTask(t, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete, hoveredBtnId, setHoveredBtnId, setConfirmDeleteId, expandedAgentTasks, toggleAgent))}
          </div>
        )}
      </div>

      <div onMouseDown={handleMouseDown} style={{ height: 4, cursor: dragging ? 'grabbing' : 'grab', background: dragging ? '#58a6ff' : '#30363d', flexShrink: 0, transition: dragging ? 'none' : 'background 0.15s', userSelect: 'none' }} />

      <div style={{ flex: `${100 - dividerPos}`, overflow: 'auto', minHeight: 60 }}>
        <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#8b949e', borderBottom: '1px solid #21262d' }}>
          <FormattedMessage id="treeview.completed" />
        </div>
        {completedTasks.length === 0 ? (
          <div style={{ padding: 16, color: '#8b949e', fontSize: 12 }}><FormattedMessage id="treeview.noCompleted" /></div>
        ) : (
          <div style={{ padding: 8 }}>
            {completedTasks.map(t => renderFlatTask(t, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete, hoveredBtnId, setHoveredBtnId, setConfirmDeleteId, expandedAgentTasks, toggleAgent))}
          </div>
        )}
      </div>
    </div>
  )
}
