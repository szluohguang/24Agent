# 流式控制台 & 继续提问 Bug 修复 — 执行日志

## 2026-05-25

### 根因分析 (Phase 1)

**Issue 1: 流式控制台无大模型输出**
- `handleSessionComplete()` 调用 `this.agents.delete(sessionId)` 删除 agent
- 删除后 `agent.stream[]` 丢失，`getState()` 不再包含该 session
- 前端 `applyState` merge 的 `state.agents` 中没有该 agent，session 从 UI 消失
- 后续 `stream-delta` 到达时 `onTextDelta` 里 `this.agents.get(sessionId) === undefined` → delta 被静默丢弃

**Issue 2: 继续提问不触发模型处理**
- agent 被删除后 `continuePrompt()` 中 `this.agents.get(sessionId) === undefined` → throw
- `handleWsMessage` 是同步函数，未 await 也未 catch → unhandled promise rejection
- `sendTaskPrompt` 从未执行，模型不处理

### 修复 (Phase 2-3)

| 文件 | 变更 |
|------|------|
| `types.ts` | AgentState.status 增加 completed/failed/recovering/aborted 状态 |
| `core.ts` | handleSessionComplete/handleSessionError/handleHungSession/abortTask 全部改为保留 agent 不删除，仅更新状态标记 |
| `core.ts` | dispatchTask 末尾追加 `onStateChange()` 广播，前端能收到 running 状态 |
| `websocket.ts` | handleWsMessage 改为 async，所有 async 方法加 await；WS on('message') 改为 async handler 并 catch 错误返回给客户端 |

### 验证
- `tsc --noEmit` → ✓
- `npm run test` → 180/180 ✓
- `npm run test:e2e` → 27/27 ✓
