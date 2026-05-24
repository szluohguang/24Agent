import React, { useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { useLocale } from '../i18n/useLocale.js'

interface ControlBarProps {
  connected: boolean
  permissionLevel: string
  onSetPermission: (level: string) => void
  onCreateTask: (description: string) => void
}

export function ControlBar({
  connected,
  permissionLevel,
  onSetPermission,
  onCreateTask,
}: ControlBarProps) {
  const [taskInput, setTaskInput] = useState('')
  const { locale, setLocale } = useLocale()
  const intl = useIntl()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskInput.trim()) return
    onCreateTask(taskInput.trim())
    setTaskInput('')
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 16px', background: '#161b22',
        borderTop: '1px solid #30363d', fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? '#3fb950' : '#f85149', display: 'inline-block',
        }} />
        <span style={{ color: '#8b949e' }}>{connected
          ? <FormattedMessage id="status.connected" />
          : <FormattedMessage id="status.disconnected" />}</span>
      </div>

      <select
        value={permissionLevel}
        onChange={(e) => onSetPermission(e.target.value)}
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
        onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
        style={{
          padding: '4px 10px', background: '#21262d', color: '#c9d1d9',
          border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          whiteSpace: 'nowrap',
        }}
      >
        {locale === 'zh-CN' ? 'English' : '中文'}
      </button>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder={intl.formatMessage({ id: 'placeholder.taskDescription' })}
          style={{
            flex: 1, padding: '6px 10px', background: '#0d1117', color: '#c9d1d9',
            border: '1px solid #30363d', borderRadius: 4, fontSize: 13,
          }}
        />
        <button type="submit"
          style={{
            padding: '6px 16px', background: '#238636', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
          }}>
          <FormattedMessage id="button.addTask" />
        </button>
      </form>
    </div>
  )
}
