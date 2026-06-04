import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { useWebSocket } from './hooks/useWebSocket.js'
import { useLocale } from './i18n/useLocale.js'
import { StreamConsole } from './components/StreamConsole.js'
import { TreeView } from './components/TreeView.js'
import { HealthDashboard } from './components/HealthDashboard.js'
import { ScheduleManager } from './components/ScheduleManager.js'
import { ReviewPanel } from './components/ReviewPanel.js'
import { HistoryPanel } from './components/HistoryPanel.js'
import { WebhookManager } from './components/WebhookManager.js'
import { SettingsPage } from './components/SettingsPage.js'
import { ProjectDetail } from './components/ProjectDetail.js'
import { StatusBar } from './components/StatusBar.js'
import { LogViewer } from './components/LogViewer.js'
import type { TaskNode, TimelineEntryData, CometEngineState, SystemLogEntry } from './types.js'

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

export interface ChunkData {
  type: string
  content: string
  toolName?: string
}

export function App() {
  const [sessions, setSessions] = useState<Record<string, { taskId: string; stream: string[] }>>({})
  const [sessionChunks, setSessionChunks] = useState<Record<string, { taskId: string; chunks: ChunkData[] }>>({})
  const { connected, lastMessage, send, isReconnecting, reconnectAttempts } = useWebSocket(WS_URL, {
    onStreamDelta: (sessionId, delta) => {
      setSessions((prev) => {
        const existing = prev[sessionId]
        if (!existing) {
          return { ...prev, [sessionId]: { taskId: '', stream: [delta] } }
        }
        return { ...prev, [sessionId]: { ...existing, stream: [...existing.stream, delta] } }
      })
    },
  })
  const { locale, setLocale } = useLocale()
  const intl = useIntl()
  const [tasks, setTasks] = useState<TaskNode[]>([])
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntryData[]>([])
  const [permissionLevel, setPermissionLevel] = useState('safe')
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>()
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>()
  const [agents, setAgents] = useState<Array<{ sessionId: string; taskId: string; healthStatus: string; lastHeartbeat: number; startTime: number }>>([])
  const [healthStale, setHealthStale] = useState(false)
  const [page, setPage] = useState<'home' | 'settings' | 'project'>('home')
  const [taskInput, setTaskInput] = useState('')
  const [followUpInput, setFollowUpInput] = useState('')
  const [lastUserPrompt, setLastUserPrompt] = useState('')
  const [budget, setBudget] = useState<{ spent: number; limit: number }>({ spent: 0, limit: 50 })
  const [cometState, setCometState] = useState<CometEngineState | null>(null)
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([])
  const [showLogViewer, setShowLogViewer] = useState(false)
  const pendingAutoSelectRef = useRef<string | null>(null)

  // Initial data loads
  useEffect(() => {
    fetch('/api/comet/status').then(r => r.json()).then(data => {
      if (data.engineAvailable) setCometState(data.state)
    }).catch(() => {})
    fetch('/api/logs').then(r => r.json()).then(data => {
      if (data.logs) setSystemLogs(data.logs)
    }).catch(() => {})
  }, [])

  // Health polling
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/health')
        if (res.ok) {
          setHealthStale(false)
        } else {
          setSystemLogs(prev => [...prev, {
            id: `log-${Date.now()}`,
            time: Date.now(),
            type: 'error',
            message: `健康检查返回 ${res.status}`,
            source: 'health',
          }])
        }
      } catch {
        setHealthStale(true)
        setSystemLogs(prev => [...prev, {
          id: `log-${Date.now()}`,
          time: Date.now(),
          type: 'error',
          message: '服务连接中断',
          source: 'health',
        }])
      }
    }
    const id = setInterval(poll, 5000)
    poll()
    return () => clearInterval(id)
  }, [])

  // Sync selectedTaskId -> activeSessionId
  useEffect(() => {
    if (!selectedTaskId) {
      setActiveSessionId(undefined)
      return
    }
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (task?.sessionId) {
      setActiveSessionId(task.sessionId)
    } else {
      setActiveSessionId(undefined)
    }
  }, [selectedTaskId, tasks])

  const applyState = useCallback((state: { tasks?: TaskNode[]; agents?: Array<{ sessionId: string; taskId: string; stream: string[]; healthStatus: string; lastHeartbeat: number; startTime: number }>; timeline?: TimelineEntryData[]; budget?: { spent: number; limit: number } }) => {
    if (state?.tasks) setTasks(state.tasks)
    if (state?.budget) setBudget(state.budget)
    if (state?.timeline) setTimelineEntries(state.timeline)
    if (state?.agents) {
      const validAgents = state.agents.filter((a): a is typeof a & { sessionId: string } => !!a.sessionId)
      setSessions((prev) => {
        const merged = { ...prev }
        for (const a of validAgents) {
          merged[a.sessionId] = { taskId: a.taskId, stream: a.stream || [] }
        }
        return merged
      })
      setAgents(validAgents.map((a) => ({
        sessionId: a.sessionId, taskId: a.taskId,
        healthStatus: a.healthStatus || 'healthy',
        lastHeartbeat: a.lastHeartbeat || Date.now(),
        startTime: a.startTime,
      })))
    }
  }, [])

  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'connected': {
        const msg = lastMessage as { type: 'connected'; clientId: string; state: unknown }
        const state = msg.state as
          | { tasks?: TaskNode[]; timeline?: TimelineEntryData[]; agents?: Array<{ sessionId: string; taskId: string; stream: string[]; healthStatus: string; lastHeartbeat: number; startTime: number }> }
          | undefined
        applyState(state)
        break
      }
      case 'state-update': {
        const msg = lastMessage as { type: 'state-update'; state: unknown }
        if (msg.state) {
          const state = msg.state as { tasks?: TaskNode[]; timeline?: TimelineEntryData[]; agents?: Array<{ sessionId: string; taskId: string; stream: string[]; healthStatus: string; lastHeartbeat: number; startTime: number }> }
          applyState(state)
          // 自动选中最匹配的已创建任务
          if (pendingAutoSelectRef.current && state.tasks) {
            const desc = pendingAutoSelectRef.current
            const matched = state.tasks.find(t => t.description === desc && t.sessionId)
            if (matched) {
              pendingAutoSelectRef.current = null
              setSelectedTaskId(matched.id)
            }
          }
        }
        break
      }
      case 'timeline': {
        const msg = lastMessage as { type: 'timeline'; entry: TimelineEntryData }
        if (msg.entry) setTimelineEntries((prev) => [...prev, msg.entry])
        break
      }
      case 'agent-state': {
        const msg = lastMessage as { type: 'agent-state'; sessionId: string; state: unknown }
        const st = msg.state as { status?: string; healthStatus?: string; lastHeartbeat?: number } | undefined
        if (st?.healthStatus) {
          setAgents((prev) => prev.map((a) => a.sessionId === msg.sessionId ? { ...a, healthStatus: st.healthStatus!, lastHeartbeat: st.lastHeartbeat ?? a.lastHeartbeat } : a))
        }
        setSessions((prev) => {
          if (!prev[msg.sessionId]) return prev
          return { ...prev, [msg.sessionId]: { ...prev[msg.sessionId] } }
        })
        break
      }
      case 'health-report': {
        const msg = lastMessage as { type: 'health-report'; data: unknown }
        const data = msg.data as { agents?: typeof agents } | undefined
        if (data?.agents) setAgents(data.agents)
        setHealthStale(false)
        break
      }
      case 'task-deleted': {
        const msg = lastMessage as { type: 'task-deleted'; taskId: string }
        if (typeof msg.taskId !== 'string') break
        setTasks((prev) => prev.filter((t) => t.id !== msg.taskId))
        setSelectedTaskId((prev) => prev === msg.taskId ? undefined : prev)
        break
      }
      case 'comet-state-update': {
        const msg = lastMessage as { type: 'comet-state-update'; state: CometEngineState }
        if (msg.state) setCometState(msg.state)
        break
      }
      case 'system-log': {
        const msg2 = lastMessage as { type: 'system-log'; entry: SystemLogEntry }
        if (msg2.entry) setSystemLogs(prev => [...prev, msg2.entry])
        break
      }
      case 'chunk-delta': {
        const msg = lastMessage as { type: 'chunk-delta'; sessionId: string; chunk: ChunkData }
        if (typeof msg.sessionId !== 'string') break
        setSessionChunks((prev) => {
          const existing = prev[msg.sessionId]
          const c = msg.chunk
          if (!existing) {
            return { ...prev, [msg.sessionId]: { taskId: '', chunks: [c] } }
          }
          const oldChunks = existing.chunks
          const last = oldChunks[oldChunks.length - 1]
          const newChunks = last && last.type === c.type && c.type !== 'tool_call' && c.type !== 'tool_result'
            ? [...oldChunks.slice(0, -1), { ...last, content: last.content + c.content }]
            : [...oldChunks, c]
          return { ...prev, [msg.sessionId]: { ...existing, chunks: newChunks } }
        })
        break
      }
    }
  }, [lastMessage, applyState])

  const handleDispatch = useCallback((taskId: string) => send({ type: 'dispatch-task', taskId }), [send])
  const handleAbort = useCallback((taskId: string) => send({ type: 'abort-task', taskId }), [send])
  const handleDelete = useCallback((taskId: string) => send({ type: 'delete-task', taskId }), [send])
  const handleSetPermission = useCallback((level: string) => {
    setPermissionLevel(level)
    send({ type: 'set-permission', level })
  }, [send])
  const handleCreateTask = useCallback((description: string) => {
    pendingAutoSelectRef.current = description
    send({ type: 'create-task', description, dependsOn: [], cometPhase: cometState?.phase })
  }, [send, cometState])

  const handleApprove = useCallback((taskId: string, feedback?: string) => {
    send({ type: 'approve-task', taskId, feedback })
  }, [send])

  const handleReject = useCallback((taskId: string, feedback: string) => {
    send({ type: 'reject-task', taskId, feedback })
  }, [send])

  const handleCometDecision = useCallback((decisionId: string, choice: string) => {
    send({ type: 'comet-decision', decisionId, choice })
  }, [send])

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskInput.trim()) return
    handleCreateTask(taskInput.trim())
    setTaskInput('')
  }

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId((prev) => prev === taskId ? undefined : taskId)
  }, [])

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!followUpInput.trim() || !activeSessionId) return
    const prompt = followUpInput.trim()
    setLastUserPrompt(prompt)
    send({ type: 'continue-prompt', sessionId: activeSessionId, prompt })
    setSessionChunks((prev) => {
      const existing = prev[activeSessionId]
      if (!existing) {
        return { ...prev, [activeSessionId]: { taskId: '', chunks: [{ type: 'user', content: prompt }] } }
      }
      return { ...prev, [activeSessionId]: { ...existing, chunks: [...existing.chunks, { type: 'user', content: prompt }] } }
    })
    setFollowUpInput('')
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '6px 10px', background: '#0d1117', color: '#c9d1d9',
    border: '1px solid #30363d', borderRadius: 4, fontSize: 13,
  }

  const btnStyle: React.CSSProperties = {
    padding: '6px 16px', background: '#238636', color: '#fff',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>⚡</span>
          <span
            style={{ fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => setPage('home')}
          >
            <FormattedMessage id="app.title" />
          </span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            <button
              onClick={() => setPage('home')}
              style={{
                padding: '4px 10px', background: page === 'home' ? '#0d1117' : 'transparent',
                color: '#c9d1d9', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}
            >
              <FormattedMessage id="tab.orchestrator" />
            </button>
            <button
              onClick={() => setPage('project')}
              style={{
                padding: '4px 10px', background: page === 'project' ? '#0d1117' : 'transparent',
                color: '#c9d1d9', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}
            >
              <FormattedMessage id="nav.project" />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
          <button
            onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
            style={{
              padding: '4px 10px', background: '#21262d', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {locale === 'zh-CN' ? 'English' : '中文'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isReconnecting ? '#d29922' : connected ? '#3fb950' : '#f85149' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: 'currentColor' }} />
            {isReconnecting ? (
              <FormattedMessage id="status.reconnecting" values={{ count: reconnectAttempts }} />
            ) : connected ? (
              <FormattedMessage id="status.connected" />
            ) : (
              <FormattedMessage id="status.disconnected" />
            )}
          </div>

          <select
            value={permissionLevel}
            onChange={(e) => handleSetPermission(e.target.value)}
            style={{
              padding: '4px 8px', background: '#0d1117', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, fontSize: 12,
            }}
          >
            <option value="trusted"><FormattedMessage id="permission.trusted" /></option>
            <option value="safe"><FormattedMessage id="permission.safe" /></option>
            <option value="strict"><FormattedMessage id="permission.strict" /></option>
          </select>

          <button
            onClick={() => setPage('settings')}
            title={intl.formatMessage({ id: 'app.settings' })}
            style={{
              padding: '4px 8px', background: '#21262d', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 14,
            }}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Page content */}
      {page === 'home' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left column: Task Tree (fixed width) */}
        <div style={{
          width: 320, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #30363d', background: '#0d1117',
        }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TreeView
              tasks={tasks} agents={agents}
              selectedTaskId={selectedTaskId}
              onDispatch={handleDispatch} onAbort={handleAbort}
              onDelete={handleDelete}
              onSelect={handleSelectTask}
              cometState={cometState ?? undefined}
            />
          </div>
          <form onSubmit={handleSubmitTask} style={{
            display: 'flex', gap: 8, padding: '8px 12px',
            borderTop: '1px solid #30363d', background: '#161b22',
          }}>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder={intl.formatMessage({ id: 'placeholder.taskDescription' })}
              style={inputStyle}
            />
            <button type="submit" style={btnStyle}>
              <FormattedMessage id="button.addTask" />
            </button>
          </form>
        </div>

        {/* Middle column: Stream Console (dynamic width) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d1117', minWidth: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #30363d', paddingLeft: 12 }}>
            <span style={{ padding: '8px 0', fontSize: 13, color: '#c9d1d9', fontWeight: 600 }}>
              <FormattedMessage id="tab.console" />
            </span>
            {selectedTask && (
              <span style={{ padding: '8px 12px', fontSize: 12, color: '#8b949e' }}>
                — {selectedTask.description}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <StreamConsole sessions={sessions} sessionChunks={sessionChunks} activeSessionId={activeSessionId} lastUserPrompt={lastUserPrompt} selectedTaskId={selectedTaskId} cometDecision={cometState?.activeDecision ?? null} onCometDecision={handleCometDecision} />
          </div>
          {/* Review panel for awaiting_review tasks */}
          {selectedTask?.status === 'awaiting_review' && (
            <ReviewPanel
              task={selectedTask}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
          {/* Follow-up prompt input — 选中有 session 的任务时显示 */}
          {activeSessionId && (
            <form onSubmit={handleFollowUpSubmit} style={{
              display: 'flex', gap: 8, padding: '8px 12px',
              borderTop: '1px solid #30363d', background: '#161b22',
            }}>
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder={intl.formatMessage({ id: 'placeholder.followUp' })}
                style={inputStyle}
              />
              <button type="submit" title={intl.formatMessage({ id: 'button.continuePrompt' })} style={{
                ...btnStyle, background: '#1f6feb',
              }}>
                <FormattedMessage id="button.continuePrompt" />
              </button>
            </form>
          )}
        </div>

          {/* Right column: Health Dashboard (fixed width, right-aligned) */}
        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: '1px solid #30363d', background: '#0d1117',
          display: 'flex', flexDirection: 'column', overflow: 'auto',
        }}>
          <HealthDashboard agents={agents.map((a) => {
            const task = tasks.find((t) => t.id === a.taskId)
            return { ...a, taskDescription: task?.description }
          })} stale={healthStale} budget={budget} cometState={cometState} />
        </div>
      </div>
      ) : page === 'settings' ? (
        <SettingsPage
          timelineEntries={timelineEntries}
          budget={budget}
          send={send}
          setBudget={setBudget}
        />
      ) : (
        <ProjectDetail onNavigate={(p) => setPage(p)} />
      )}
      <StatusBar logs={systemLogs} onClick={() => setShowLogViewer(true)} />
      {showLogViewer && (
        <LogViewer
          logs={systemLogs}
          onClose={() => setShowLogViewer(false)}
          onAcknowledge={(id) => {
            fetch(`/api/logs/${id}/acknowledge`, { method: 'POST' }).catch(() => {})
            setSystemLogs(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e))
          }}
        />
      )}
    </div>
  )
}
