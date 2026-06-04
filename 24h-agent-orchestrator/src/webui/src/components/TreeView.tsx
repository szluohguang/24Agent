import React, { useRef, useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
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

const PHASE_ORDER = ['open', 'design', 'build', 'verify', 'archive']
const PHASE_LABELS: Record<string, string> = {
  open: '开启', design: '深度设计', build: '计划与构建',
  verify: '验证与收尾', archive: '归档',
}
const PHASE_SHORT: Record<string, string> = {
  open: '开启', design: '设计', build: '构建', verify: '验证', archive: '归档',
}
const PHASE_COLORS: Record<string, string> = {
  open: '#238636', design: '#58a6ff', build: '#d29922', verify: '#f0883e', archive: '#8b949e',
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

function PhaseProgress({ cometPhase }: { cometPhase?: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
        {PHASE_ORDER.map(p => {
          const idx = PHASE_ORDER.indexOf(cometPhase || '')
          const phaseIdx = PHASE_ORDER.indexOf(p)
          const done = phaseIdx < idx
          const active = phaseIdx === idx
          return (
            <div key={p} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: done ? '#238636' : active ? '#58a6ff' : '#21262d',
            }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 0, fontSize: 9, color: '#484f58' }}>
        {PHASE_ORDER.map(p => {
          const idx = PHASE_ORDER.indexOf(cometPhase || '')
          const phaseIdx = PHASE_ORDER.indexOf(p)
          const done = phaseIdx < idx
          const active = phaseIdx === idx
          return (
            <span key={p} style={{
              flex: 1,
              color: done ? '#3fb950' : active ? '#58a6ff' : '#484f58',
            }}>
              {done ? '✓' : active ? '●' : '○'}{PHASE_SHORT[p]}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function TreeView({ tasks, agents, selectedTaskId, onDispatch, onAbort, onSelect, onDelete }: TreeViewProps) {
  const [hoveredBtnId, setHoveredBtnId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

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

  const rootTasks = useMemo(() => tasks.filter(t => t.dependsOn.length === 0), [tasks])
  const activeCount = tasks.filter(t => ACTIVE_STATUSES.has(t.status)).length
  const completedCount = tasks.filter(t => COMPLETED_STATUSES.has(t.status)).length
  const pendingCount = tasks.filter(t => t.status === 'pending').length

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const getSubIcon = (task: TaskNode): { icon: string; color: string } => {
    if (COMPLETED_STATUSES.has(task.status)) return { icon: '✓', color: '#3fb950' }
    if (task.status === 'running') return { icon: '●', color: '#58a6ff' }
    if (task.status === 'pending') return { icon: '○', color: '#484f58' }
    return { icon: STATUS_ICONS[task.status] || '○', color: STATUS_COLORS[task.status] || '#8b949e' }
  }

  if (tasks.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <div>暂无任务，输入描述创建新任务</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 确认删除弹窗 */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 24, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, color: '#c9d1d9', marginBottom: 16 }}>确定删除此任务及其子任务？</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 16px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>取消</button>
              <button onClick={() => { const t = tasks.find(t2 => t2.id === confirmDeleteId); if (t?.status === 'running') onAbort(confirmDeleteId); onDelete(confirmDeleteId); setConfirmDeleteId(null) }}
                style={{ padding: '6px 16px', background: '#da3633', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>确定删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {rootTasks.map(root => {
          const children = taskMap.get(root.id) || []
          const isExpanded = expandedTasks.has(root.id)
          const phase = root.cometPhase || PHASE_ORDER.find(p => root.description.includes(`[${PHASE_LABELS[p]}]`)) || ''

          return (
            <div key={root.id} style={{
              background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, marginBottom: 8,
              outline: selectedTaskId === root.id ? '1px solid #58a6ff' : 'none',
            }}>
              {/* 根任务头部 */}
              <div
                onClick={() => onSelect(root.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  cursor: 'pointer', borderBottom: children.length > 0 && isExpanded ? '1px solid #21262d' : 'none',
                  borderTopLeftRadius: 8, borderTopRightRadius: 8,
                }}
                onMouseEnter={e => { if (selectedTaskId !== root.id) (e.currentTarget as HTMLElement).style.background = '#161b22' }}
                onMouseLeave={e => { if (selectedTaskId !== root.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ color: STATUS_COLORS[root.status], fontSize: 10, flexShrink: 0 }}>
                  {STATUS_ICONS[root.status] || '○'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#c9d1d9', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {root.description}
                  </div>
                  <PhaseProgress cometPhase={phase} />
                </div>
                <span style={{
                  background: STATUS_COLORS[root.status] + '22', color: STATUS_COLORS[root.status],
                  border: '1px solid ' + STATUS_COLORS[root.status], borderRadius: 10,
                  padding: '1px 8px', fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0,
                }}>{root.status}</span>
              </div>

              {/* 子任务 */}
              {children.length > 0 && (
                <>
                  {/* 展开/折叠按钮 */}
                  <div
                    onClick={() => toggleExpand(root.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                      cursor: 'pointer', fontSize: 11, color: '#8b949e', userSelect: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#161b22'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 10 }}>{isExpanded ? '▼' : '▶'}</span>
                    <span>{isExpanded ? '收起子任务' : children.length + ' 个子任务'}</span>
                  </div>
                  {isExpanded && children.map((child, ci) => {
                    const si = getSubIcon(child)
                    const isSelectedSub = selectedTaskId === child.id
                    return (
                      <div key={child.id}
                        onClick={() => onSelect(child.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px 6px 28px', fontSize: 12,
                          background: isSelectedSub ? '#161b22' : 'transparent',
                          borderLeft: isSelectedSub ? '2px solid #58a6ff' : '2px solid transparent',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { if (!isSelectedSub) (e.currentTarget as HTMLElement).style.background = '#161b22' }}
                        onMouseLeave={e => { if (!isSelectedSub) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ color: '#8b949e', fontSize: 10, flexShrink: 0 }}>▶</span>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: si.color, display: 'inline-block', flexShrink: 0,
                          border: si.color === '#484f58' ? '2px solid #484f58' : 'none',
                        }} />
                        <span style={{
                          color: isSelectedSub ? '#c9d1d9' : si.color === '#3fb950' ? '#8b949e' : si.color === '#484f58' ? '#484f58' : '#c9d1d9',
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textDecoration: child.status === 'completed' || child.status === 'failed' ? 'line-through' : 'none',
                          textDecorationColor: '#484f58',
                        }}>
                          {child.description}
                        </span>
                        {child.status === 'pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); onDispatch(child.id) }}
                            style={{
                              background: '#238636', color: '#fff', border: 'none',
                              borderRadius: 3, padding: '2px 8px', fontSize: 10, cursor: 'pointer', flexShrink: 0,
                            }}
                          >▶</button>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部统计 */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #21262d',
        display: 'flex', gap: 16, fontSize: 11, background: '#161b22', flexShrink: 0,
      }}>
        {activeCount > 0 && <span style={{ color: '#58a6ff' }}>进行中 <strong>{activeCount}</strong></span>}
        {completedCount > 0 && <span style={{ color: '#3fb950' }}>已完成 <strong>{completedCount}</strong></span>}
        {pendingCount > 0 && <span style={{ color: '#484f58' }}>待处理 <strong>{pendingCount}</strong></span>}
        <span style={{ marginLeft: 'auto', color: '#8b949e' }}>共 {tasks.length} 任务</span>
      </div>
    </div>
  )
}
