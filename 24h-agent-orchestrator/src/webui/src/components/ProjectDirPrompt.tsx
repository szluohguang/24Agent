import { useState } from 'react'

export function ProjectDirPrompt({ onConfirm }: { onConfirm: (dir: string) => void }) {
  const [dir, setDir] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleBrowse = async () => {
    try {
      const handle = await window.showDirectoryPicker()
      setDir(handle.name)
      setError('')
    } catch { /* user cancelled */ }
  }

  const handleSave = async () => {
    if (!dir.trim()) { setError('请输入项目目录路径'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/project/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: dir.trim(), goal: '', description: '' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '保存失败')
        return
      }
      onConfirm(dir.trim())
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
        padding: 24, width: 480, maxWidth: '90%',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#c9d1d9', marginBottom: 8 }}>
          📁 设置项目目录
        </div>
        <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 16 }}>
          请先设置项目工作目录，所有任务将在此目录下执行。
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={dir}
            onChange={e => { setDir(e.target.value); setError('') }}
            placeholder="输入完整目录路径，或点击浏览选择"
            style={{
              flex: 1, padding: '8px 10px', background: '#0d1117', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, fontSize: 13,
            }}
          />
          <button onClick={handleBrowse} style={{
            padding: '8px 14px', background: '#21262d', color: '#c9d1d9',
            border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}>浏览</button>
        </div>
        {error && <div style={{ color: '#f85149', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 20px', background: saving ? '#484f58' : '#238636', color: '#fff',
            border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
          }}>{saving ? '保存中...' : '确认'}</button>
        </div>
      </div>
    </div>
  )
}
