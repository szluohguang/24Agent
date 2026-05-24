import React, { useRef, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'

interface StreamConsoleProps {
  sessions: Record<string, { taskId: string; stream: string[] }>
  activeSessionId?: string
}

export function StreamConsole({ sessions, activeSessionId }: StreamConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [sessions, activeSessionId])

  const sessionIds = activeSessionId
    ? [activeSessionId]
    : Object.keys(sessions)

  if (sessionIds.length === 0) {
    return (
      <div style={{ padding: 16, color: '#8b949e', fontStyle: 'italic' }}>
        <FormattedMessage id="stream.noSessions" />
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      style={{
        height: '100%', overflowY: 'auto', padding: 12,
        fontFamily: '"SF Mono", "Cascadia Code", "Consolas", monospace',
        fontSize: 12, lineHeight: 1.5,
      }}
    >
      {sessionIds.map((sid) => {
        const session = sessions[sid]
        if (!session) return null
        return (
          <div key={sid} style={{ marginBottom: 16 }}>
            <div style={{ color: '#58a6ff', fontWeight: 'bold', marginBottom: 4 }}>
              [{sid.slice(0, 8)}] {session.taskId}
            </div>
            {session.stream.map((line, i) => (
              <div key={i} style={{ color: '#c9d1d9', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
