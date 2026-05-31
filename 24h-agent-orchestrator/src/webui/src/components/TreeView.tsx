import React, { useRef, useEffect, useState, useMemo } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type { TaskNode, TaskStatus } from '../types.js'

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

const DIALOG_OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const DIALOG_BOX: React.CSSProperties = { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 24, maxWidth: 420 }

const btnBase = { padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 } as const
const dispatchBtnStyle: React.CSSProperties = { ...btnBase, background: '#238636', color: '#fff' }
const abortBtnStyle: React.CSSProperties = { ...btnBase, background: '#da3633', color: '#fff' }
const deleteBtnStyle: React.CSSProperties = { ...btnBase, background: '#484f58', color: '#8b949e', border: '1px solid #30363d' }

function TaskItem({ task, agent, isSelected, isHovered, onSelect, onDispatch, onAbort, onDelete, hoveredBtnId, setHoveredBtnId, setConfirmDeleteId, children }: {
  task: TaskNode; agent?: AgentInfo; isSelected: boolean; isHovered: boolean
  onSelect: (id: string) => void; onDispatch: (id: string) => void; onAbort: (id: string) => void; onDelete: (id: string) => void
  hoveredBtnId: string | null; setHoveredBtnId: (id: string | null) => void; setConfirmDeleteId: (id: string | null) => void; children?: React.ReactNode
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
      </div>
      {children}
    </div>
  )
}

function handleDeleteClick(task: TaskNode, onDelete: (id: string) => void, setConfirmDeleteId: (id: string | null) => void) {
  if (task.status === 'running') {
    setConfirmDeleteId(task.id)
  } else {
    onDelete(task.id)
  }
}

export function TreeView({ tasks, agents, selectedTaskId, onDispatch, onAbort, onDelete, onSelect }: TreeViewProps) {
  const intl = useIntl()
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [hoveredBtnId, setHoveredBtnId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dividerPos, setDividerPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const isRunning = confirmDeleteId ? tasks.find(t => t.id === confirmDeleteId)?.status === 'running' : false

  const childMap = useMemo(() => {
    const map = new Map<string, TaskNode[]>()
    for (const t of tasks) {
      for (const dep of t.dependsOn) {
        const list = map.get(dep) || []
        list.push(t)
        map.set(dep, list)
      }
    }
    return map
  }, [tasks])

  const activeTasks = useMemo(() => tasks.filter(t => ACTIVE_STATUSES.has(t.status)), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => COMPLETED_STATUSES.has(t.status)), [tasks])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    const startY = e.clientY
    const container = containerRef.current
    if (!container) return
    const startH = container.getBoundingClientRect().height
    const controller = new AbortController()
    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY
      const pct = ((startH / 2 + delta) / startH) * 100
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

  const renderTask = (task: TaskNode, indent = 0) => {
    const agent = task.sessionId ? agents.find(a => a.sessionId === task.sessionId) : undefined
    const isSelected = task.id === selectedTaskId
    const isHovered = task.id === hoveredTaskId
    const hasChildren = childMap.has(task.id)
    const isExpanded = expandedParents.has(task.id)
    const children = hasChildren ? childMap.get(task.id)! : []

    return (
      <div key={task.id} style={{ marginLeft: indent * 16 }}>
        <TaskItem task={task} agent={agent} isSelected={isSelected} isHovered={isHovered}
          onSelect={onSelect} onDispatch={onDispatch} onAbort={onAbort} onDelete={onDelete}
          hoveredBtnId={hoveredBtnId} setHoveredBtnId={setHoveredBtnId} setConfirmDeleteId={setConfirmDeleteId}>
          {hasChildren && (
            <div style={{ marginTop: 2 }}>
              <span onClick={() => {
                setExpandedParents(prev => {
                  const next = new Set(prev)
                  if (next.has(task.id)) next.delete(task.id)
                  else next.add(task.id)
                  return next
                })
              }} style={{ fontSize: 11, color: '#58a6ff', cursor: 'pointer', userSelect: 'none' }}>
                {isExpanded ? '▼ 收起子任务' : `▶ ${children.length} 个子任务`}
              </span>
            </div>
          )}
        </TaskItem>
        {hasChildren && isExpanded && children.map(c => renderTask(c, indent + 1))}
      </div>
    )
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
              <button onClick={() => { if (isRunning && confirmDeleteId) onAbort(confirmDeleteId); if (confirmDeleteId) onDelete(confirmDeleteId); setConfirmDeleteId(null) }}
                style={{ padding: '6px 16px', background: '#da3633', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                <FormattedMessage id="dialog.confirm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 进行中 */}
      <div style={{ flex: `${dividerPos}`, overflow: 'auto', minHeight: 60 }}>
        <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#58a6ff', borderBottom: '1px solid #21262d' }}>
          <FormattedMessage id="treeview.active" />
        </div>
        {activeTasks.length === 0 ? (
          <div style={{ padding: 16, color: '#8b949e', fontSize: 12 }}><FormattedMessage id="treeview.noActive" /></div>
        ) : (
          <div style={{ padding: 8 }}>{activeTasks.map(t => renderTask(t))}</div>
        )}
      </div>

      {/* 拖拽分割线 */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: 4, cursor: dragging ? 'grabbing' : 'grab', background: dragging ? '#58a6ff' : '#30363d',
          flexShrink: 0, transition: dragging ? 'none' : 'background 0.15s', userSelect: 'none',
        }}
      />

      {/* 已结束 */}
      <div style={{ flex: `${100 - dividerPos}`, overflow: 'auto', minHeight: 60 }}>
        <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#8b949e', borderBottom: '1px solid #21262d' }}>
          <FormattedMessage id="treeview.completed" />
        </div>
        {completedTasks.length === 0 ? (
          <div style={{ padding: 16, color: '#8b949e', fontSize: 12 }}><FormattedMessage id="treeview.noCompleted" /></div>
        ) : (
          <div style={{ padding: 8 }}>{completedTasks.map(t => renderTask(t))}</div>
        )}
      </div>
    </div>
  )
}
