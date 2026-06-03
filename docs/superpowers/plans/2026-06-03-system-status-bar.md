---
change: system-status-bar
design-doc: docs/superpowers/specs/2026-06-03-system-status-bar-design.md
base-ref: 879a7940b8efc82ff9fad694c9f65138e549cf13
---

# System Status Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom status bar showing system anomaly info with color-coded levels and a log viewer page.

**Architecture:** LogBuffer ring cache on backend (500 entries, 500ms dedup), WebSocket push, React StatusBar + LogViewer components.

**Tech Stack:** TypeScript, Fastify, React 19

---

### Task 1: Backend types and LogBuffer

**Files:**
- Modify: `src/webui/src/types.ts` — add SystemLogEntry
- Modify: `src/orchestrator/logger.ts` — add LogBuffer

- [ ] **Step 1: Add SystemLogEntry type to webui types**

In `src/webui/src/types.ts`, append:
```typescript
export interface SystemLogEntry {
  id: string
  time: number
  type: 'info' | 'warning' | 'error'
  message: string
  source: string
  count?: number
  acknowledged?: boolean
}
```

- [ ] **Step 2: Add LogBuffer to logger.ts**

In `src/orchestrator/logger.ts`, add:
```typescript
export interface SystemLogEntry {
  id: string
  time: number
  type: 'info' | 'warning' | 'error'
  message: string
  source: string
  count?: number
  acknowledged?: boolean
}

export class LogBuffer {
  private maxSize = 500
  private entries: SystemLogEntry[] = []
  private lastMerge: Record<string, number> = {}

  push(entry: Omit<SystemLogEntry, 'id' | 'time'>): SystemLogEntry {
    const key = `${entry.source}:${entry.type}`
    const now = Date.now()
    const last = this.lastMerge[key]
    if (last && now - last < 500) {
      const existing = this.entries[this.entries.length - 1]
      if (existing && existing.source === entry.source && existing.type === entry.type) {
        existing.count = (existing.count || 1) + 1
        return existing
      }
    }
    this.lastMerge[key] = now
    const log: SystemLogEntry = {
      ...entry,
      id: `log-${now}-${Math.random().toString(36).slice(2, 6)}`,
      time: now,
      count: 1,
    }
    this.entries.push(log)
    if (this.entries.length > this.maxSize) this.entries.shift()
    return log
  }

  getAll(): SystemLogEntry[] {
    return [...this.entries]
  }

  getByType(type: string): SystemLogEntry[] {
    if (type === 'all') return this.getAll()
    return this.entries.filter(e => e.type === type)
  }

  acknowledge(id: string): void {
    const entry = this.entries.find(e => e.id === id)
    if (entry) entry.acknowledged = true
  }

  get hasUnacknowledgedError(): boolean {
    return this.entries.some(e => e.type === 'error' && !e.acknowledged)
  }

  get latest(): SystemLogEntry | null {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : null
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/webui/src/types.ts src/orchestrator/logger.ts
git commit -m "feat: add SystemLogEntry type and LogBuffer ring cache"
```

---

### Task 2: API and WebSocket integration

**Files:**
- Modify: `src/server/api.ts` — add GET /api/logs
- Modify: `src/server/websocket.ts` — add system-log broadcast
- Modify: `src/webui/src/hooks/useWebSocket.ts` — add system-log to WsMessage
- Modify: `src/orchestrator/core.ts` — add LogBuffer injection and log sources

- [ ] **Step 1: Add GET /api/logs endpoint**

In `src/server/api.ts`, add:
```typescript
app.get('/api/logs', async () => {
  const buf = (orchestrator as any).logBuffer
  if (!buf) return { logs: [] }
  return { logs: buf.getAll() }
})
```

- [ ] **Step 2: Add system-log broadcast**

In `src/server/websocket.ts`, the broadcast function should support `system-log` type.

- [ ] **Step 3: Add system-log to WsMessage type**

In `src/webui/src/hooks/useWebSocket.ts`:
```typescript
| { type: 'system-log'; entry: import('../types').SystemLogEntry }
```

- [ ] **Step 4: Inject LogBuffer into core.ts and add log sources**

In `src/orchestrator/core.ts`:
- Add `this.logBuffer = new LogBuffer()` in constructor
- Add log source injection in:
  - `handleSessionError`: `this.logBuffer.push({ type: 'error', message: '...', source: 'agent-error' })`
  - `handleHungSession`: `this.logBuffer.push({ type: 'error', message: '...', source: 'agent-hung' })`
  - Budget check: `this.logBuffer.push({ type: 'warning', message: '...', source: 'budget' })`
  - On session retry: `this.logBuffer.push({ type: 'warning', message: '...', source: 'agent-retry' })`
- After each push, broadcast to WS clients:
  ```typescript
  this.broadcast?.({ type: 'system-log', entry: latest })
  ```

- [ ] **Step 5: Commit**

```bash
git add src/server/api.ts src/server/websocket.ts src/webui/src/hooks/useWebSocket.ts src/orchestrator/core.ts
git commit -m "feat: add log API, WS push, and log source collection"
```

---

### Task 3: StatusBar component

**Files:**
- Create: `src/webui/src/components/StatusBar.tsx`
- Modify: `src/webui/src/App.tsx` — add bottom bar, handle system-log WS

- [ ] **Step 1: Create StatusBar.tsx**

```typescript
import type { SystemLogEntry } from '../types'

const TYPE_COLORS: Record<string, string> = {
  info: '#58a6ff',
  warning: '#d29922',
  error: '#da3633',
}

export function StatusBar({ logs, onAcknowledge, onClick }: {
  logs: SystemLogEntry[]
  onAcknowledge?: (id: string) => void
  onClick?: () => void
}) {
  const unackedError = [...logs].reverse().find(e => e.type === 'error' && !e.acknowledged)
  const latest = unackedError || logs[logs.length - 1]

  if (!latest) return null

  const color = TYPE_COLORS[latest.type] || '#8b949e'

  return (
    <div
      onClick={onClick}
      style={{
        height: 28, display: 'flex', alignItems: 'center', padding: '0 12px',
        background: '#161b22', borderTop: '1px solid #30363d',
        fontSize: 12, cursor: 'pointer',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: color, marginRight: 8, flexShrink: 0,
      }} />
      <span style={{ color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        [{latest.source}] {latest.message}
        {latest.count && latest.count > 1 ? ` (×${latest.count})` : ''}
      </span>
      {latest.type === 'error' && !latest.acknowledged && (
        <span style={{ color: '#da3633', fontSize: 10, marginLeft: 8, flexShrink: 0 }}>● 未确认</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Integrate in App.tsx**

Add state:
```typescript
const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([])
const [showLogViewer, setShowLogViewer] = useState(false)
```

Add initial fetch:
```typescript
useEffect(() => {
  fetch('/api/logs').then(r => r.json()).then(data => {
    if (data.logs) setSystemLogs(data.logs)
  }).catch(() => {})
}, [])
```

Add WS handler (in the switch):
```typescript
case 'system-log': {
  const msg = lastMessage as { type: 'system-log'; entry: SystemLogEntry }
  if (msg.entry) setSystemLogs(prev => [...prev, msg.entry])
  break
}
```

Add StatusBar to layout (after page content, before closing root div):
```typescript
{page === 'home' && (
  <StatusBar logs={systemLogs} onClick={() => setShowLogViewer(true)} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/webui/src/components/StatusBar.tsx src/webui/src/App.tsx
git commit -m "feat: add StatusBar component and integrate into App layout"
```

---

### Task 4: LogViewer component

**Files:**
- Create: `src/webui/src/components/LogViewer.tsx`
- Modify: `src/webui/src/App.tsx` — integrate LogViewer overlay

- [ ] **Step 1: Create LogViewer.tsx**

```typescript
import { useState, useMemo } from 'react'
import type { SystemLogEntry } from '../types'

const TYPE_COLORS: Record<string, string> = {
  info: '#58a6ff',
  warning: '#d29922',
  error: '#da3633',
}
const TYPE_LABELS: Record<string, string> = {
  all: '全部', info: 'Info', warning: 'Warning', error: 'Error',
}

export function LogViewer({ logs, onClose, onAcknowledge }: {
  logs: SystemLogEntry[]
  onClose: () => void
  onAcknowledge: (id: string) => void
}) {
  const [filter, setFilter] = useState<string>('all')
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const list = filter === 'all' ? logs : logs.filter(e => e.type === filter)
    return [...list].reverse() // 时间倒序
  }, [logs, filter])

  const handleClick = (entry: SystemLogEntry) => {
    if (entry.type === 'error' && !clickedIds.has(entry.id)) {
      setClickedIds(prev => new Set(prev).add(entry.id))
      onAcknowledge(entry.id)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column', zIndex: 1000,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 16px',
        background: '#161b22', borderBottom: '1px solid #30363d',
      }}>
        <span style={{ color: '#c9d1d9', fontWeight: 600, fontSize: 14, flex: 1 }}>系统日志</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'info', 'warning', 'error'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              background: filter === t ? '#30363d' : 'transparent',
              color: filter === t ? '#c9d1d9' : '#8b949e',
              border: '1px solid #30363d', borderRadius: 4,
              padding: '4px 10px', fontSize: 12, cursor: 'pointer',
            }}>{TYPE_LABELS[t]}</button>
          ))}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: '#8b949e',
          fontSize: 18, cursor: 'pointer', marginLeft: 12,
        }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {filtered.map(entry => (
          <div key={entry.id} onClick={() => handleClick(entry)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '6px 10px', borderBottom: '1px solid #21262d',
            cursor: entry.type === 'error' ? 'pointer' : 'default',
            background: entry.type === 'error' && !entry.acknowledged && !clickedIds.has(entry.id)
              ? 'rgba(218,54,51,0.08)' : 'transparent',
          }}>
            <span style={{
              flexShrink: 0, width: 10, height: 10, borderRadius: '50%',
              background: TYPE_COLORS[entry.type] || '#8b949e',
              marginTop: 4,
            }} />
            <span style={{ flexShrink: 0, color: '#8b949e', fontSize: 11, width: 70 }}>
              {new Date(entry.time).toLocaleTimeString()}
            </span>
            <span style={{
              flexShrink: 0, color: TYPE_COLORS[entry.type], fontSize: 11,
              width: 50, fontWeight: 600,
            }}>{entry.type.toUpperCase()}</span>
            <span style={{ flexShrink: 0, color: '#8b949e', fontSize: 11, width: 80 }}>
              [{entry.source}]
            </span>
            <span style={{ color: '#c9d1d9', fontSize: 12, flex: 1 }}>
              {entry.message}
              {entry.count && entry.count > 1 ? ` (×${entry.count})` : ''}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
            暂无日志
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add LogViewer to App.tsx**

After the StatusBar:
```typescript
{showLogViewer && (
  <LogViewer
    logs={systemLogs}
    onClose={() => setShowLogViewer(false)}
    onAcknowledge={(id) => {
      fetch(`/api/logs/${id}/acknowledge`, { method: 'POST' }).catch(() => {})
      setSystemLogs(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e))
    }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/webui/src/components/LogViewer.tsx src/webui/src/App.tsx
git commit -m "feat: add LogViewer overlay with type filter and error acknowledge"
```

---

### Task 5: Health polling log source

- [ ] **Step 1: Add health poll logging in App.tsx**

In the health polling useEffect, add:
```typescript
try {
  const res = await fetch('/health')
  if (res.ok) {
    setHealthStale(false)
  } else {
    dispatchSystemLog({ type: 'error', message: `健康检查返回 ${res.status}`, source: 'health' })
  }
} catch {
  setHealthStale(true)
  dispatchSystemLog({ type: 'error', message: '服务连接中断', source: 'health' })
}
```

- [ ] **Step 2: Add acknowledge API endpoint**

In `src/server/api.ts`:
```typescript
app.post<{ Params: { id: string } }>('/api/logs/:id/acknowledge', async (request) => {
  const buf = (orchestrator as any).logBuffer
  if (buf) buf.acknowledge(request.params.id)
  return { ok: true }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/webui/src/App.tsx src/server/api.ts
git commit -m "feat: add health poll logging and acknowledge API"
```

---

### Task 6: Build and test verification

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS (tsc + vite)

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: verify build and tests pass"
```
