import { useState, useEffect, useRef } from 'react'

interface DirEntry {
  name: string
  path: string
}

export function ProjectDirPrompt({ onConfirm }: { onConfirm: (dir: string) => void }) {
  const [dir, setDir] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState('')
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    fetch('/api/fs/cwd').then(r => r.json()).then(d => {
      if (d.cwd) setDir(d.cwd)
    }).catch(() => {})
  }, [])

  const loadDir = async (path: string) => {
    setLoadErr('')
    try {
      const res = await fetch('/api/fs/list?path=' + encodeURIComponent(path))
      const data = await res.json()
      setEntries(data.entries || [])
      setCurrentPath(data.current || '')
      setParentPath(data.parent || '')
      if (data.error) setLoadErr(data.error)
    } catch { setLoadErr('无法读取目录') }
  }

  const openBrowser = async () => {
    setBrowsing(true)
    const startPath = dir.trim() || (await fetch('/api/fs/cwd').then(r => r.json()).then(d => d.cwd || '/'))
    await loadDir(startPath)
  }

  const navigateTo = (path: string) => loadDir(path)
  const selectDir = (path: string) => {
    setDir(path)
    setError('')
    setBrowsing(false)
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
      // 保存成功后触发 Eagle 技能安装
      try {
        const initRes = await fetch('/api/project/init-eagle', { method: 'POST' })
        const initData = await initRes.json()
        if (initData.success) {
          setError('✅ 项目目录已设置，Eagle 环境安装完成')
        } else {
          setError('⚠️ 目录已保存，但环境安装未完成: ' + (initData.message || '未知错误'))
          return // 不关闭弹窗，让用户看到错误
        }
      } catch {
        setError('⚠️ 目录已保存，但环境安装请求失败')
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
        padding: 24, width: 560, maxWidth: '90%',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#c9d1d9', marginBottom: 8 }}>
          📁 设置项目目录
        </div>
        <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 16 }}>
          所有任务将在项目目录下执行。
        </div>

        {/* 路径输入行 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={dir}
            onChange={e => { setDir(e.target.value); setError('') }}
            placeholder="输入完整目录路径"
            style={{
              flex: 1, padding: '8px 10px', background: '#0d1117', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, fontSize: 13, fontFamily: 'monospace',
            }}
          />
          <button onClick={openBrowser} style={{
            padding: '8px 14px', background: '#21262d', color: '#c9d1d9',
            border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
          }}>浏览...</button>
        </div>

        {error && <div style={{ color: '#f85149', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        {/* 目录浏览器 */}
        {browsing && (
          <div style={{
            border: '1px solid #30363d', borderRadius: 6, marginBottom: 8,
            background: '#0d1117', maxHeight: 260, overflow: 'auto',
          }}>
            <div style={{
              padding: '6px 10px', borderBottom: '1px solid #30363d',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}>
              <button onClick={() => navigateTo(parentPath)} disabled={currentPath === parentPath}
                style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: 14, padding: 0 }}>⬆</button>
              <span style={{ color: '#8b949e', fontFamily: 'monospace', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentPath}
              </span>
              <button onClick={() => setBrowsing(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
            </div>
            {loadErr && <div style={{ padding: 8, color: '#f85149', fontSize: 12 }}>{loadErr}</div>}
            {entries.length === 0 && !loadErr && (
              <div style={{ padding: 16, textAlign: 'center', color: '#484f58', fontSize: 12 }}>此目录为空</div>
            )}
            {entries.map(e => (
              <div key={e.path} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                cursor: 'pointer', borderBottom: '1px solid #21262d', fontSize: 13,
              }}
                onDoubleClick={() => navigateTo(e.path)}
                onClick={() => selectDir(e.path)}
              >
                <span style={{ flexShrink: 0 }}>📁</span>
                <span style={{ color: '#c9d1d9', flex: 1 }}>{e.name}</span>
                <span style={{ fontSize: 10, color: '#8b949e' }}>双击浏览</span>
              </div>
            ))}
          </div>
        )}

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
