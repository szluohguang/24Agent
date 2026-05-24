import React, { useState, useEffect, useCallback } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { useWebSocket } from './hooks/useWebSocket.js'
import { StreamConsole } from './components/StreamConsole.js'
import { Timeline } from './components/Timeline.js'
import { ControlBar } from './components/ControlBar.js'

interface TaskNode {
  id: string
  description: string
  status: string
  sessionId?: string
  dependsOn: string[]
}

interface TimelineEntryData {
  id: string
  time: number
  source: string
  sessionId?: string
  type: string
  message: string
}

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

export function App() {
  const { connected, lastMessage, send } = useWebSocket(WS_URL)
  const [tasks, setTasks] = useState<TaskNode[]>([])
  const [sessions, setSessions] = useState<Record<string, { taskId: string; stream: string[] }>>({})
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntryData[]>([])
  const [permissionLevel, setPermissionLevel] = useState('safe')
  const [activeTab, setActiveTab] = useState<'console' | 'timeline'>('console')
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>()
  const intl = useIntl()

  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'connected': {
        const state = (lastMessage as { type: 'connected'; clientId: string; state: unknown }).state as
          | { tasks?: TaskNode[]; timeline?: TimelineEntryData[]; agents?: Array<{ sessionId: string; taskId: string; stream: string[] }> }
          | undefined
        if (state?.tasks) setTasks(state.tasks)
        if (state?.timeline) setTimelineEntries(state.timeline)
        if (state?.agents) {
          const sessionsMap: Record<string, { taskId: string; stream: string[] }> = {}
          for (const a of state.agents) {
            sessionsMap[a.sessionId] = { taskId: a.taskId, stream: a.stream || [] }
          }
          setSessions(sessionsMap)
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
        setSessions((prev) => {
          if (!prev[msg.sessionId]) return prev
          return { ...prev, [msg.sessionId]: { ...prev[msg.sessionId] } }
        })
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
        }}
      >
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
        <div style={{ width: 320, borderRight: '1px solid #30363d', overflowY: 'auto', background: '#0d1117' }}>
          <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#8b949e', textTransform: 'uppercase' }}>
            <FormattedMessage id="app.tasks" />
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => { if (task.sessionId) setActiveSessionId(task.sessionId) }}
              style={{
                padding: '8px 12px', margin: '2px 4px', borderRadius: 4, cursor: 'pointer',
                background: activeSessionId === task.sessionId ? '#1f2937' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  color: task.status === 'completed' ? '#3fb950'
                    : task.status === 'running' ? '#58a6ff'
                    : task.status === 'failed' ? '#f85149' : '#8b949e',
                  fontSize: 14,
                }}>
                  {task.status === 'completed' ? '✓' : task.status === 'running' ? '●' : task.status === 'failed' ? '✗' : '○'}
                </span>
                <span style={{ fontSize: 13, color: '#c9d1d9' }}>{task.description}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {task.status === 'pending' && (
                  <button onClick={(e) => { e.stopPropagation(); handleDispatch(task.id) }}
                    style={{ padding: '2px 8px', background: '#238636', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                    <FormattedMessage id="task.dispatch" />
                  </button>
                )}
                {task.status === 'running' && (
                  <button onClick={(e) => { e.stopPropagation(); handleAbort(task.id) }}
                    style={{ padding: '2px 8px', background: '#da3633', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                    <FormattedMessage id="task.abort" />
                  </button>
                )}
              </div>
              {task.dependsOn.length > 0 && (
                <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                  <FormattedMessage id="task.depends" />: {task.dependsOn.join(', ')}
                </div>
              )}
            </div>
          ))}
          {tasks.length === 0 && (
            <div style={{ padding: 16, color: '#8b949e', fontSize: 12 }}>
              <FormattedMessage id="app.noTasks" />
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #30363d' }}>
            <button onClick={() => setActiveTab('console')}
              style={{
                padding: '8px 16px', background: 'transparent', cursor: 'pointer', fontSize: 13,
                color: activeTab === 'console' ? '#c9d1d9' : '#8b949e',
                border: 'none', borderBottom: activeTab === 'console' ? '2px solid #58a6ff' : '2px solid transparent',
              }}>
              <FormattedMessage id="tab.console" />
            </button>
            <button onClick={() => setActiveTab('timeline')}
              style={{
                padding: '8px 16px', background: 'transparent', cursor: 'pointer', fontSize: 13,
                color: activeTab === 'timeline' ? '#c9d1d9' : '#8b949e',
                border: 'none', borderBottom: activeTab === 'timeline' ? '2px solid #58a6ff' : '2px solid transparent',
              }}>
              <FormattedMessage id="tab.timeline" />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'console' ? (
              <StreamConsole sessions={sessions} activeSessionId={activeSessionId} />
            ) : (
              <Timeline entries={timelineEntries} />
            )}
          </div>
        </div>
      </div>

      <ControlBar
        connected={connected}
        permissionLevel={permissionLevel}
        onSetPermission={handleSetPermission}
        onCreateTask={handleCreateTask}
      />
    </div>
  )
}
