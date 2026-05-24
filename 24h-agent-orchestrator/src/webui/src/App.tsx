import React, { useState, useEffect, useCallback } from 'react'
import { FormattedMessage } from 'react-intl'
import { useWebSocket } from './hooks/useWebSocket.js'
import { StreamConsole } from './components/StreamConsole.js'
import { Timeline } from './components/Timeline.js'
import { ControlBar } from './components/ControlBar.js'
import { TreeView } from './components/TreeView.js'
import { HealthDashboard } from './components/HealthDashboard.js'
import { ScheduleManager } from './components/ScheduleManager.js'
import type { TaskNode, TimelineEntryData } from './types.js'

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

type Tab = 'tasks' | 'console' | 'timeline' | 'health' | 'schedule'

export function App() {
  const { connected, lastMessage, send, isReconnecting, reconnectAttempts } = useWebSocket(WS_URL)
  const [tasks, setTasks] = useState<TaskNode[]>([])
  const [sessions, setSessions] = useState<Record<string, { taskId: string; stream: string[] }>>({})
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntryData[]>([])
  const [permissionLevel, setPermissionLevel] = useState('safe')
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>()
  const [agents, setAgents] = useState<Array<{ sessionId: string; taskId: string; healthStatus: string; lastHeartbeat: number; startTime: number }>>([])
  const [healthStale, setHealthStale] = useState(false)

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

  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'connected': {
        const msg = lastMessage as { type: 'connected'; clientId: string; state: unknown }
        const state = msg.state as
          | { tasks?: TaskNode[]; timeline?: TimelineEntryData[]; agents?: Array<{ sessionId: string; taskId: string; stream: string[]; healthStatus: string; lastHeartbeat: number; startTime: number }> }
          | undefined
        if (state?.tasks) setTasks(state.tasks)
        if (state?.timeline) setTimelineEntries(state.timeline)
        if (state?.agents) {
          const sessionsMap: Record<string, { taskId: string; stream: string[] }> = {}
          const agentList: typeof agents = []
          for (const a of state.agents) {
            sessionsMap[a.sessionId] = { taskId: a.taskId, stream: a.stream || [] }
            agentList.push({ sessionId: a.sessionId, taskId: a.taskId, healthStatus: a.healthStatus || 'healthy', lastHeartbeat: a.lastHeartbeat || Date.now(), startTime: a.startTime })
          }
          setSessions(sessionsMap)
          setAgents(agentList)
        }
        break
      }
      case 'timeline': {
        const msg = lastMessage as { type: 'timeline'; entry: TimelineEntryData }
        if (msg.entry) setTimelineEntries((prev) => [...prev, msg.entry])
        break
      }
      case 'stream-delta': {
        const msg = lastMessage as { type: 'stream-delta'; sessionId: string; delta: string }
        setSessions((prev) => {
          const existing = prev[msg.sessionId]
          if (!existing) return prev
          return { ...prev, [msg.sessionId]: { ...existing, stream: [...existing.stream, msg.delta] } }
        })
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
  }, [lastMessage])

  const handleDispatch = useCallback((taskId: string) => send({ type: 'dispatch-task', taskId }), [send])
  const handleAbort = useCallback((taskId: string) => send({ type: 'abort-task', taskId }), [send])
  const handleSetPermission = useCallback((level: string) => {
    setPermissionLevel(level)
    send({ type: 'set-permission', level })
  }, [send])
  const handleCreateTask = useCallback((description: string) => {
    send({ type: 'create-task', description, dependsOn: [] })
  }, [send])

  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { id: 'tasks', label: <>📋 <FormattedMessage id="app.tasks" /></> },
    { id: 'console', label: <>💻 <FormattedMessage id="tab.console" /></> },
    { id: 'timeline', label: <>📜 <FormattedMessage id="tab.timeline" /></> },
    { id: 'health', label: <>❤️ <FormattedMessage id="tab.health" /></> },
    { id: 'schedule', label: <>📅 <FormattedMessage id="tab.schedule" /></> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>⚡</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}><FormattedMessage id="app.title" /></span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8b949e' }}>
          <span><FormattedMessage id="app.tasks" />: {tasks.length}</span>
          <span><FormattedMessage id="app.active" />: {Object.keys(sessions).length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar with tabs */}
        <div style={{ width: 52, borderRight: '1px solid #30363d', background: '#161b22', display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 0', background: 'transparent', cursor: 'pointer', fontSize: 18,
                border: 'none', borderLeft: activeTab === tab.id ? '3px solid #58a6ff' : '3px solid transparent',
                color: activeTab === tab.id ? '#c9d1d9' : '#8b949e',
              }}
              title={typeof tab.label === 'string' ? tab.label : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
          {activeTab === 'tasks' && (
            <TreeView tasks={tasks} onDispatch={handleDispatch} onAbort={handleAbort} />
          )}
          {activeTab === 'console' && (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #30363d', paddingLeft: 12 }}>
                <span style={{ padding: '8px 0', fontSize: 13, color: '#c9d1d9', fontWeight: 600 }}>
                  <FormattedMessage id="tab.console" />
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <StreamConsole sessions={sessions} activeSessionId={activeSessionId} />
              </div>
            </>
          )}
          {activeTab === 'timeline' && (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #30363d', paddingLeft: 12 }}>
                <span style={{ padding: '8px 0', fontSize: 13, color: '#c9d1d9', fontWeight: 600 }}>
                  <FormattedMessage id="tab.timeline" />
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Timeline entries={timelineEntries} />
              </div>
            </>
          )}
          {activeTab === 'health' && (
            <HealthDashboard agents={agents} stale={healthStale} />
          )}
          {activeTab === 'schedule' && (
            <ScheduleManager />
          )}
        </div>
      </div>

      <ControlBar
        connected={connected}
        isReconnecting={isReconnecting}
        reconnectAttempts={reconnectAttempts}
        permissionLevel={permissionLevel}
        onSetPermission={handleSetPermission}
        onCreateTask={handleCreateTask}
      />
    </div>
  )
}
