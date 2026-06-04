import { useState, useRef } from 'react'

export function ProjectDirPrompt({ onConfirm }: { onConfirm: (dir: string) => void }) {
  const [dir, setDir] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBrowse = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker()
        // showDirectoryPicker 只返回目录名，不返回完整路径
        const dirName = handle.name
        setDir(dirName)
        setError('已选择目录「' + dirName + '」，请在路径前补全完整路径。\n如: /Users/yourname/' + dirName)
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError('目录选择器不可用，请手动输入完整路径: ' + (e?.message || ''))
        }
      }
    } else if (fileInputRef.current) {
      // 回退: 使用 webkitdirectory
      fileInputRef.current.click()
    } else {
      setError('当前浏览器不支持目录选择，请手动输入完整路径')
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    // webkitdirectory 不暴露完整路径，仅用于确认用户已选择目录
    setDir('')
    setError('检测到目录已选择。浏览器安全限制无法读取完整路径，\n请手动输入完整目录路径（如 /Users/yourname/project）后点击确认。')
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
      <input ref={fileInputRef} type="file" webkitdirectory="" style={{ display: 'none' }} onChange={handleFileSelected} />
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
        padding: 24, width: 520, maxWidth: '90%',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#c9d1d9', marginBottom: 8 }}>
          📁 设置项目目录
        </div>
        <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 16 }}>
          所有任务将在项目目录下执行。请填入完整路径，如 <code style={{ background: '#0d1117', padding: '1px 4px', borderRadius: 3 }}>/Users/name/my-project</code>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={dir}
            onChange={e => { setDir(e.target.value); setError('') }}
            placeholder="输入完整目录路径"
            style={{
              flex: 1, padding: '8px 10px', background: '#0d1117', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, fontSize: 13,
            }}
          />
          <button onClick={handleBrowse} style={{
            padding: '8px 14px', background: '#21262d', color: '#c9d1d9',
            border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
          }}>浏览...</button>
        </div>
        {error && (
          <div style={{
            color: error.includes('不可用') ? '#f85149' : '#d29922',
            fontSize: 12, marginBottom: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5,
          }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 20px', background: saving ? '#484f58' : '#238636', color: '#fff',
            border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
          }}>{saving ? '保存中...' : '确认'}</button>
        </div>
      </div>
    </div>
  )
}
