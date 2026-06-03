# 左侧任务树 Change 根节点重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将左侧任务树的根节点从 5 个独立阶段改为 1 个 Change 根节点，阶段降为二级目录

**Architecture:** 当前已实现 3 级树（Phase→Task→Agent），需重构为 4 级（Change→Phase→Task→Agent）。PhaseNode 组件改为内嵌在 ChangeRootNode 下，新增 ChangeRootNode 组件。

**Tech Stack:** React 19 + TypeScript + CSS-in-JS (inline styles)

**Design Doc:** `docs/superpowers/specs/2026-06-03-task-tree-design.md`

---

### Task 1: 新增 ChangeRootNode 组件

**Files:**
- Modify: `src/webui/src/components/TreeView.tsx`

- [ ] **Step 1: 在 PhaseNode 之前新增 ChangeRootNode 组件**

在 `function TreeView` 之前，新增 `ChangeRootNode` 组件，接受 `cometState` 作为 props。

```tsx
function ChangeRootNode({ cometState, children }: {
  cometState: CometEngineState
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const phaseLabels: Record<string, string> = {
    open: '开启', design: '深度设计', build: '计划与构建',
    verify: '验证与收尾', archive: '归档',
  }
  const workflowLabel = cometState.workflow === 'hotfix' ? 'hotfix' : cometState.workflow === 'tweak' ? 'tweak' : '完整流程'

  return (
    <div>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '12px 14px', borderRadius: 8,
          background: '#1c2333',
          border: '1px solid #d29922',
          cursor: 'pointer', userSelect: 'none',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#d29922', fontWeight: 'bold', fontSize: 14 }}>
            {expanded ? '▼' : '▶'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#c9d1d9' }}>
            {cometState.changeName}
          </span>
          <span style={{
            fontSize: 11, color: '#8b949e', background: '#0d1117',
            padding: '2px 8px', borderRadius: 10,
            border: '1px solid #30363d',
          }}>
            {cometState.phase} · {workflowLabel}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#58a6ff' }}>
            {cometState.phases[cometState.phase]?.status === 'active'
              ? `${cometState.phases[cometState.phase]?.progress || 0}%`
              : ''}
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '2px 0 2px 8px', borderLeft: '2px solid #d29922', marginLeft: 6 }}>
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证组件已正确定义且无类型错误**

- [ ] **Step 3: Commit**

```bash
git add src/webui/src/components/TreeView.tsx
git commit -m "feat: add ChangeRootNode component for tree root"
```

---

### Task 2: 重构 TreeView cometState 渲染路径

**Files:**
- Modify: `src/webui/src/components/TreeView.tsx`

当前 `if (cometState)` 分支渲染 5 个独立的 PhaseNode。改为渲染一个 ChangeRootNode 包含所有 PhaseNode。

- [ ] **Step 1: 替换 `if (cometState)` 内的渲染逻辑**

将：
```tsx
if (cometState) {
    const phaseTasks = (phase: string) =>
      tasks.filter(t => t.cometPhase === phase || t.description.toLowerCase().includes(`[${phase}]`))

    return (
      <div style={{ padding: 8, overflow: 'auto', height: '100%' }}>
        ...
        {PHASE_ORDER.map(phase => (
          <PhaseNode key={phase} phase={phase} state={cometState.phases[phase]}
            tasks={phaseTasks(phase)} ...
          />
        ))}
        ...
      </div>
    )
  }
```

改为：
```tsx
if (cometState) {
    const phaseTasks = (phase: string) =>
      tasks.filter(t => t.cometPhase === phase || t.description.toLowerCase().includes(`[${phase}]`))

    const hasAnyTasks = tasks.length > 0

    return (
      <div style={{ padding: 8, overflow: 'auto', height: '100%' }}>
        <ChangeRootNode cometState={cometState}>
          {PHASE_ORDER.map(phase => (
            <PhaseNode key={phase} phase={phase} state={cometState.phases[phase]}
              tasks={phaseTasks(phase)} agents={agents}
              selectedTaskId={selectedTaskId}
              onDispatch={onDispatch} onAbort={onAbort} onSelect={onSelect} onDelete={onDelete}
              hoveredBtnId={hoveredBtnId} setHoveredBtnId={setHoveredBtnId}
              confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId}
            />
          ))}
          {(() => {
            const unassigned = tasks.filter(t => !t.cometPhase && !PHASE_ORDER.some(p => t.description.toLowerCase().includes(`[${p}]`)))
            if (unassigned.length === 0) return null
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ padding: '10px 12px', borderRadius: 6, background: '#0d1117', border: '1px solid #21262d', opacity: 0.7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#8b949e', fontWeight: 'bold', fontSize: 13 }}>○</span>
                    <span style={{ fontSize: 13, color: '#8b949e' }}>其他任务</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#484f58' }}>({unassigned.length})</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </ChangeRootNode>
      </div>
    )
  }
```

- [ ] **Step 2: 运行 typecheck 确认类型正确**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: 运行前端测试**

Run: `npx vitest run src/webui`
Expected: All TreeView tests pass

- [ ] **Step 4: Commit**

```bash
git add src/webui/src/components/TreeView.tsx
git commit -m "feat: wrap phase tree in ChangeRootNode with change name header"
```

---

### Task 3: 后端添加 changeName 字段到 WS 初始状态

**Files:**
- Modify: `src/server/websocket.ts`
- Modify: `src/orchestrator/core.ts`

确保前端通过 WebSocket 连接时收到的 state 中包含 cometEngine 的 changeName 信息。

- [ ] **Step 1: core.ts getState 添加 cometInfo**

在 `Orchestrator.getState()` 末尾添加 comet 引擎信息：

```ts
getState() {
    return {
      tasks: Array.from(this.tasks.values()),
      agents: Array.from(this.agents.values()),
      timeline: this.timeline,
      budget: { spent: this.budgetSpent, limit: this.budgetLimit },
      cometState: this.cometEngine?.getCurrentState() ?? null,
    }
  }
```

- [ ] **Step 2: websocket.ts 连接时透传完整 state**

当前 `connected` 消息已经调用 `orchestrator.getState()`，其返回值现在包含 `cometState`，前端 App.tsx 的 `connected` 和 `state-update` 处理器接收 state 时会自动包含。

- [ ] **Step 3: Commit**

```bash
git add src/orchestrator/core.ts
git commit -m "feat: include cometState in orchestrator getState for WS init"
```

---

### Task 4: 前端 types 同步更新

**Files:**
- Modify: `src/webui/src/types.ts`

`CometEngineState` 已存在。需确认 `TaskNode` 类型的 `cometPhase` 字段未被意外移除。

- [ ] **Step 1: 验证 TaskNode 存在 cometPhase 字段**

确认 `src/webui/src/types.ts` 中 `TaskNode` 包含 `cometPhase?: string`。

- [ ] **Step 2: Commit（如无改动则跳过）**

---

### Task 5: 构建验证

- [ ] **Step 1: 全量构建**

Run: `npm run build`
Expected: tsc + vite build 无错误

- [ ] **Step 2: 全量测试**

Run: `npm run test`
Expected: 206+/208 测试通过（2 个 Windows guard 失败为预存问题）

- [ ] **Step 3: 启动服务验证 UI**

Run: `npm run dev` → 打开 `http://localhost:5173` → 检查左侧树是否显示 ChangeRootNode

```bash
git commit -m "chore: build and test verification"
```
