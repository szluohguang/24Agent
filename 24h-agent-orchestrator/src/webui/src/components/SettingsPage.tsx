import React, { useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { ScheduleManager } from './ScheduleManager'
import { HistoryPanel } from './HistoryPanel'
import { WebhookManager } from './WebhookManager'
import { ProjectSettings } from './ProjectSettings'
import { WeChatSettings } from './WeChatSettings'
import type { TimelineEntryData } from '../types'

type SettingsTab = 'schedule' | 'history' | 'webhook' | 'config' | 'project' | 'wechat'

const SIDEBAR_ITEMS: { key: SettingsTab; messageId: string }[] = [
  { key: 'project', messageId: 'projectSettings.title' },
  { key: 'wechat', messageId: 'wechat.title' },
  { key: 'schedule', messageId: 'tab.schedule' },
  { key: 'history', messageId: 'history.title' },
  { key: 'webhook', messageId: 'webhook.title' },
  { key: 'config', messageId: 'tab.config' },
]

interface SettingsPageProps {
  timelineEntries: TimelineEntryData[]
  budget: { spent: number; limit: number }
  send: (msg: unknown) => void
  setBudget: React.Dispatch<React.SetStateAction<{ spent: number; limit: number }>>
}

export function SettingsPage({ timelineEntries, budget, send, setBudget }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>('schedule')
  const [pluginUpdating, setPluginUpdating] = useState(false)
  const [pluginResult, setPluginResult] = useState<string | null>(null)
  const [eagleMode, setEagleMode] = useState<string>('auto')

  // Load eagle mode
  React.useEffect(() => {
    fetch('/api/config/eagle-mode').then(r => r.json()).then(d => {
      if (d.mode) setEagleMode(d.mode)
    }).catch(() => {})
  }, [])

  const handleEagleModeChange = async (mode: string) => {
    setEagleMode(mode)
    try {
      await fetch('/api/config/eagle-mode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
    } catch {}
  }

  const handlePluginUpdate = async () => {
    setPluginUpdating(true)
    setPluginResult(null)
    try {
      const res = await fetch('/api/plugins/update', { method: 'POST' })
      const data = await res.json()
      setPluginResult(data.success ? '✅ 更新成功' : `❌ 更新失败: ${data.output}`)
    } catch (err: any) {
      setPluginResult(`❌ 请求失败: ${err.message}`)
    } finally {
      setPluginUpdating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{
        width: 200, flexShrink: 0, background: '#0d1117',
        borderRight: '1px solid #30363d', overflow: 'auto',
      }}>
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
              background: tab === item.key ? '#161b22' : 'transparent',
              color: tab === item.key ? '#c9d1d9' : '#8b949e',
              border: 'none',
              borderLeft: tab === item.key ? '2px solid #58a6ff' : '2px solid transparent',
              cursor: 'pointer', fontSize: 13,
              fontWeight: tab === item.key ? 600 : 400,
            }}
          >
            <FormattedMessage id={item.messageId} />
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#0d1117' }}>
        {tab === 'schedule' && <ScheduleManager />}
        {tab === 'history' && <HistoryPanel entries={timelineEntries} />}
        {tab === 'webhook' && <WebhookManager />}
        {tab === 'config' && (
          <div style={{ padding: 12 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}><FormattedMessage id="tab.config" /></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
                  <FormattedMessage id="config.budgetLimit" />
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={budget.limit}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v >= 0) {
                        setBudget((prev) => ({ ...prev, limit: v }))
                      }
                    }}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v >= 0) {
                        send({ type: 'set-budget', limit: v })
                      }
                    }}
                    style={{
                      flex: 1, padding: '6px 10px', background: '#0d1117', color: '#c9d1d9',
                      border: '1px solid #30363d', borderRadius: 4, fontSize: 13,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
                  <FormattedMessage id="config.spent" />
                </label>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#d29922', marginBottom: 8 }}>
                  ¥{budget.spent.toFixed(2)}
                </div>
                <button
                  onClick={() => {
                    setBudget((prev) => ({ ...prev, spent: 0 }))
                    send({ type: 'reset-budget' })
                  }}
                  style={{
                    padding: '6px 16px', background: '#da3633', color: '#fff',
                    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                  }}
                >
                  <FormattedMessage id="config.resetBudget" />
                </button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #30363d', paddingTop: 16, marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px', color: '#c9d1d9', fontSize: 16 }}>Eagle 模式</h3>
              <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12 }}>
                选择工作模式。自动模式下阶段流转无需确认；人工模式需用户确认每步操作。
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {['auto', 'manual'].map(m => (
                  <button key={m} onClick={() => handleEagleModeChange(m)}
                    style={{
                      padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      background: eagleMode === m ? '#238636' : '#21262d',
                      color: '#fff', border: 'none',
                    }}>{m === 'auto' ? '⚡ 自动' : '✋ 人工'}</button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#8b949e' }}>
                当前: <strong>{eagleMode === 'auto' ? '全自动' : '人工干预'}</strong>
              </span>
            </div>
            <div style={{ borderTop: '1px solid #30363d', paddingTop: 16, marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px', color: '#c9d1d9', fontSize: 16 }}>插件管理</h3>
              <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12 }}>
                从上游仓库更新 OpenSpec、Superpowers 及相关 Skill。
              </p>
              <button
                onClick={handlePluginUpdate}
                disabled={pluginUpdating}
                style={{
                  background: '#238636', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
                  fontSize: 14, opacity: pluginUpdating ? 0.6 : 1,
                }}
              >
                {pluginUpdating ? '更新中...' : '更新插件'}
              </button>
              {pluginResult && (
                <p style={{ marginTop: 8, color: '#8b949e', fontSize: 13 }}>
                  {pluginResult}
                </p>
              )}
            </div>
          </div>
        )}
        {tab === 'project' && <ProjectSettings />}
        {tab === 'wechat' && <WeChatSettings />}
      </div>
    </div>
  )
}
