import React, { useState, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'

interface ProjectConfig {
  directory: string
  goal: string
  description: string
}

export function ProjectSettings() {
  const [config, setConfig] = useState<ProjectConfig>({ directory: '', goal: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null)

  useEffect(() => {
    fetch('/api/project/config')
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json() })
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load project config', err))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/project/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (err) {
      console.error('Failed to save project config', err)
      setSaveMsg('error')
      setTimeout(() => setSaveMsg(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', background: '#0d1117', color: '#c9d1d9',
    border: '1px solid #30363d', borderRadius: 4, fontSize: 13, boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4,
  }

  if (loading) {
    return <div style={{ padding: 16, color: '#8b949e', fontSize: 13 }}><FormattedMessage id="projectSettings.loading" /></div>
  }

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}><FormattedMessage id="projectSettings.title" /></h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}><FormattedMessage id="projectSettings.directory" /></label>
          <input
            type="text"
            value={config.directory}
            onChange={(e) => setConfig((prev) => ({ ...prev, directory: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}><FormattedMessage id="projectSettings.goal" /></label>
          <textarea
            value={config.goal}
            onChange={(e) => setConfig((prev) => ({ ...prev, goal: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={labelStyle}><FormattedMessage id="projectSettings.description" /></label>
          <textarea
            value={config.description}
            onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '6px 16px', background: saving ? '#484f58' : '#238636', color: '#fff',
              border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >
            <FormattedMessage id={saving ? 'projectSettings.saving' : 'projectSettings.save'} />
          </button>
          {saveMsg === 'saved' && (
            <span style={{ color: '#3fb950', fontSize: 12 }}>
              <FormattedMessage id="projectSettings.saved" />
            </span>
          )}
          {saveMsg === 'error' && (
            <span style={{ color: '#f85149', fontSize: 12 }}>
              <FormattedMessage id="projectSettings.saveError" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
