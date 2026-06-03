import React, { useRef, useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type { ChunkData } from '../App.js'
import type { CometEngineState } from '../types.js'

interface DecisionCardProps {
  decision: {
    id: string
    prompt: string
    options: { label: string; action: string }[]
  }
  onSelect: (decisionId: string, choice: string) => void
}

function DecisionCard({ decision, onSelect }: DecisionCardProps) {
  return (
    <div style={{
      background: '#1c2333',
      border: '1px solid #58a6ff',
      borderRadius: 8, padding: 16, margin: '12px 0'
    }}>
      <div style={{ color: '#58a6ff', fontWeight: 'bold', marginBottom: 12, fontSize: 15 }}>
        ⚡ {decision.prompt}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {decision.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSelect(decision.id, opt.label)}
            style={{
              background: '#238636', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface StreamConsoleProps {
  sessions: Record<string, { taskId: string; stream: string[] }>
  sessionChunks: Record<string, { taskId: string; chunks: ChunkData[] }>
  activeSessionId?: string
  lastUserPrompt?: string
  selectedTaskId?: string
  cometDecision?: CometEngineState['activeDecision']
  onCometDecision?: (decisionId: string, choice: string) => void
}

const CHUNK_ICONS: Record<string, string> = {
  thinking: '🧠',
  tool_call: '🔧',
  tool_result: '✅',
  text: '🤖',
}

function ts() {
  return new Date().toLocaleTimeString()
}

function isErrorContent(content: string): boolean {
  return /error|fail|exception|traceback|SyntaxError|TypeError|ReferenceError/i.test(content)
}

function trimUserPrompt(content: string, lastPrompt?: string): string {
  if (!lastPrompt || !content) return content
  const trimmed = content.trimStart()
  if (trimmed.startsWith(lastPrompt)) {
    return trimmed.slice(lastPrompt.length).trimStart()
  }
  return content
}

function ChunkCard({ chunk, isLastThinking, lastUserPrompt }: { chunk: ChunkData; isLastThinking?: boolean; lastUserPrompt?: string }) {
  const [collapsed, setCollapsed] = useState(chunk.type !== 'thinking')
  const intl = useIntl()

  // thinking 卡片：流式输出中展开（collapsed=false），完成后自动折叠
  // 初始collapsed = (type !== 'thinking')，即 thinking 开始展开
  // isLastThinking 为 true 表示下一个 chunk 不是 thinking，该折叠了
  useEffect(() => {
    if (chunk.type === 'thinking') {
      setCollapsed(false)
    }
  }, [chunk.type, chunk.content])

  useEffect(() => {
    if (chunk.type === 'thinking' && isLastThinking && collapsed === false) {
      setCollapsed(true)
    }
  }, [isLastThinking])

  if (chunk.type === 'user') {
    return (
      <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#2d1f00', border: '1px solid #664d00' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 14 }}>👤</span>
          <span style={{ fontSize: 11, color: '#d4a84b' }}>
            <FormattedMessage id="chunk.you" />
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#665d33' }}>{ts()}</span>
        </div>
        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'right' }}>
          {chunk.content}
        </div>
      </div>
    )
  }

  if (chunk.type === 'thinking') {
    return (
      <div style={{ marginBottom: 8, borderRadius: 8, border: '1px solid #30363d', overflow: 'hidden', background: '#0d1117' }}>
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            background: '#161b22', fontSize: 12, color: '#d29922', userSelect: 'none',
          }}
        >
          <span>{collapsed ? '▶' : '▼'}</span>
          <span>{CHUNK_ICONS.thinking}</span>
          <span><FormattedMessage id="chunk.thinking" /></span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>{ts()}</span>
        </div>
        {!collapsed && (
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#8b949e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {chunk.content}
          </div>
        )}
      </div>
    )
  }

  if (chunk.type === 'tool_call') {
    return (
      <div style={{ marginBottom: 8, borderRadius: 8, border: '1px solid #30363d', overflow: 'hidden', background: '#0d1117' }}>
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, background: '#161b22', fontSize: 12 }}>
          <span>{CHUNK_ICONS.tool_call}</span>
          <span style={{ fontFamily: 'monospace', color: '#58a6ff', fontWeight: 600 }}>{chunk.toolName || 'tool'}</span>
          <span style={{ marginLeft: 'auto', color: '#3fb950', fontSize: 11 }}>
            <FormattedMessage id="chunk.toolRunning" />
          </span>
          <span style={{ fontSize: 10, color: '#475569' }}>{ts()}</span>
        </div>
        {chunk.content && (
          <div style={{ padding: '6px 12px', fontSize: 12, color: '#8b949e', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
            {chunk.content}
          </div>
        )}
      </div>
    )
  }

  if (chunk.type === 'tool_result') {
    const isError = chunk.content ? isErrorContent(chunk.content) : false
    return (
      <div style={{ marginBottom: 8, borderRadius: 8, border: `1px solid ${isError ? '#f85149' : '#30363d'}`, overflow: 'hidden', background: '#0d1117' }}>
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, background: '#161b22', fontSize: 12 }}>
          <span>{isError ? '❌' : CHUNK_ICONS.tool_result}</span>
          <span style={{ color: isError ? '#f85149' : '#3fb950', fontSize: 11 }}>
            <FormattedMessage id={isError ? 'chunk.toolError' : 'chunk.toolDone'} />
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>{ts()}</span>
        </div>
        {chunk.content && (
          <div style={{ padding: '6px 12px', fontSize: 12, color: isError ? '#f85149' : '#c9d1d9', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
            {chunk.content}
          </div>
        )}
      </div>
    )
  }

  const displayContent = trimUserPrompt(chunk.content, lastUserPrompt)
  return (
    <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#161b22', border: '1px solid #30363d' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{CHUNK_ICONS.text}</span>
        <span style={{ fontSize: 11, color: '#8b949e' }}>
          <FormattedMessage id="chunk.assistant" />
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>{ts()}</span>
      </div>
      <div style={{ fontSize: 13, color: '#c9d1d9', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {displayContent}
      </div>
    </div>
  )
}

const SLASH_COMMANDS = [
  { cmd: '/task create <描述>', desc: '创建任务' },
  { cmd: '/task list', desc: '列出所有任务' },
  { cmd: '/task select <id>', desc: '选择当前任务' },
  { cmd: '/task ask <问题>', desc: '对当前任务追问' },
  { cmd: '/project goal', desc: '查看项目目标' },
  { cmd: '/project goal set <文本>', desc: '设置项目目标' },
  { cmd: '/project desc', desc: '查看项目描述' },
  { cmd: '/project desc set <文本>', desc: '设置项目描述' },
  { cmd: '/project progress', desc: '查看项目进度' },
  { cmd: '/help', desc: '显示帮助' },
]

export function StreamConsole({ sessions, sessionChunks, activeSessionId, lastUserPrompt, selectedTaskId }: StreamConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionIds = activeSessionId
    ? [activeSessionId]
    : Object.keys(sessionChunks).length > 0 ? Object.keys(sessionChunks) : Object.keys(sessions)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeSessionId, sessionIds.length])

  if (sessionIds.length === 0) {
    if (!selectedTaskId) {
      return (
        <div style={{ padding: 16, color: '#8b949e', fontStyle: 'italic' }}>
          <FormattedMessage id="stream.selectTask" />
        </div>
      )
    }
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
        fontSize: 12, lineHeight: 1.5,
      }}
    >
      {cometDecision && (
        <DecisionCard decision={cometDecision} onSelect={(id, choice) => onCometDecision?.(id, choice)} />
      )}
      {sessionIds.map((sid) => {
        const chunkData = sessionChunks[sid]

        if (chunkData?.chunks && chunkData.chunks.length > 0) {
          const chunks = chunkData.chunks
          return (
            <div key={sid}>
              <div style={{ color: '#58a6ff', fontWeight: 'bold', marginBottom: 8, fontSize: 12, padding: '4px 0' }}>
                [{sid.slice(0, 8)}] {chunkData.taskId}
              </div>
              {chunks.map((c, i) => {
                const nextType = i + 1 < chunks.length ? chunks[i + 1].type : undefined
                const isLastThinking = c.type === 'thinking' && nextType && nextType !== 'thinking'
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ height: 1, background: '#21262d', margin: '4px 0 12px' }} />}
                    <ChunkCard chunk={c} isLastThinking={isLastThinking} lastUserPrompt={lastUserPrompt} />
                  </React.Fragment>
                )
              })}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
