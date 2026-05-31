import React, { useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { ScheduleManager } from './ScheduleManager'
import { HistoryPanel } from './HistoryPanel'
import { WebhookManager } from './WebhookManager'
import { ProjectSettings } from './ProjectSettings'
import type { TimelineEntryData } from '../types'

type SettingsTab = 'schedule' | 'history' | 'webhook' | 'config' | 'project'

const SIDEBAR_ITEMS: { key: SettingsTab; messageId: string }[] = [
  { key: 'schedule', messageId: 'tab.schedule' },
  { key: 'history', messageId: 'history.title' },
  { key: 'webhook', messageId: 'webhook.title' },
  { key: 'config', messageId: 'tab.config' },
  { key: 'project', messageId: 'projectSettings.title' },
]

interface SettingsPageProps {
  timelineEntries: TimelineEntryData[]
  budget: { spent: number; limit: number }
  send: (msg: unknown) => void
  setBudget: React.Dispatch<React.SetStateAction<{ spent: number; limit: number }>>
}

export function SettingsPage({ timelineEntries, budget, send, setBudget }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>('schedule')

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
          </div>
        )}
        {tab === 'project' && <ProjectSettings />}
      </div>
    </div>
  )
}
