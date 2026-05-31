import React, { useState, useEffect, useCallback } from 'react'
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
import type { TaskNode, TimelineEntryData } from './types.js'

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

export function App() {
  const [sessions, setSessions] = useState<Record<string, { taskId: string; stream: string[] }>>({})
  const { connected, lastMessage, send, isReconnecting, reconnectAttempts } = useWebSocket(WS_URL, {
    // 直接从 WebSocket onmessage 更新 sessions，避免 setLastMessage 批处理丢包
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
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'schedule' | 'history' | 'webhook'>('schedule')
  const [taskInput, setTaskInput] = useState('')
  const [followUpInput, setFollowUpInput] = useState('')

  // Health polling
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/health')
        if (res.ok) {
          setHealthStale(false)
        }
      } catch {
        setHealthStale(true)
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

  const applyState = useCallback((state: { tasks?: TaskNode[]; agents?: Array<{ sessionId: string; taskId: string; stream: string[]; healthStatus: string; lastHeartbeat: number; startTime: number }>; timeline?: TimelineEntryData[] }) => {
    if (state?.tasks) setTasks(state.tasks)
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
    send({ type: 'create-task', description, dependsOn: [] })
  }, [send])

  const handleApprove = useCallback((taskId: string, feedback?: string) => {
    send({ type: 'approve-task', taskId, feedback })
  }, [send])

  const handleReject = useCallback((taskId: string, feedback: string) => {
    send({ type: 'reject-task', taskId, feedback })
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
    send({ type: 'continue-prompt', sessionId: activeSessionId, prompt: followUpInput.trim() })
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
          <span style={{ fontSize: 15, fontWeight: 600 }}><FormattedMessage id="app.title" /></span>
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
            onClick={() => setShowSettings(true)}
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

      {/* Settings modal */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowSettings(false)}>
          <div style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
            width: '80%', maxWidth: 700, maxHeight: '80vh', overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: '1px solid #30363d',
            }}>
              <h3 style={{ margin: 0, fontSize: 15 }}><FormattedMessage id="app.settings" /></h3>
              <button onClick={() => setShowSettings(false)} style={{
                background: 'transparent', border: 'none', color: '#8b949e',
                cursor: 'pointer', fontSize: 18,
              }}>✕</button>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d' }}>
              {(['schedule', 'history', 'webhook'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  style={{
                    flex: 1, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                    background: settingsTab === tab ? '#0d1117' : 'transparent',
                    color: settingsTab === tab ? '#c9d1d9' : '#8b949e',
                    border: 'none', borderBottom: settingsTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
                    fontWeight: settingsTab === tab ? 600 : 400,
                  }}
                >
                  {tab === 'schedule' && <FormattedMessage id="tab.schedule" />}
                  {tab === 'history' && <FormattedMessage id="history.title" />}
                  {tab === 'webhook' && <FormattedMessage id="webhook.title" />}
                </button>
              ))}
            </div>
            <div style={{ padding: 8, flex: 1, overflow: 'auto' }}>
              {settingsTab === 'schedule' && <ScheduleManager />}
              {settingsTab === 'history' && <HistoryPanel entries={timelineEntries} />}
              {settingsTab === 'webhook' && <WebhookManager />}
            </div>
          </div>
        </div>
      )}

      {/* Three-column layout */}
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
            <StreamConsole sessions={sessions} activeSessionId={activeSessionId} />
          </div>
          {/* Review panel for awaiting_review tasks */}
          {selectedTask?.status === 'awaiting_review' && (
            <ReviewPanel
              task={selectedTask}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
          {/* Follow-up prompt input for selected running task */}
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
          borderLeft: '1px solid #30363d', background: '#0d1117', overflow: 'auto',
        }}>
          <HealthDashboard agents={agents} stale={healthStale} />
        </div>
      </div>
    </div>
  )
}
