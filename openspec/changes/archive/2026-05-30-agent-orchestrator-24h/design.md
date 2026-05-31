# 24h Agent Orchestrator — 设计文档

## 技术栈

| 层 | 选型 | 原因 |
|-------|--------|--------|
| 运行环境 | Node.js + TypeScript | @opencode-ai/sdk 原生 npm 包，全类型安全 |
| HTTP/WS 服务 | Fastify | 高性能、TypeScript 优先、WebSocket 插件 |
| 前端 | React + Vite | 快速开发、现代化工具链 |
| WebSocket | fastify-websocket / ws | 双向实时通信 |
| ACP 客户端 | @opencode-ai/sdk | 原生类型化客户端 + SSE 流 |
| 树形 UI | react-arborist | Agent 层级树可视化 |

## 目录结构

```
24h-agent-orchestrator/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # 入口 - 启动 serve + WebUI
│   ├── orchestrator/
│   │   ├── core.ts               # 编排主循环
│   │   ├── acp-manager.ts        # 会话创建/发 prompt/中止 via SDK
│   │   └── types.ts              # 共享类型定义
│   ├── server/
│   │   ├── http.ts               # Fastify 服务器 + 路由
│   │   ├── websocket.ts          # WebSocket 处理器
│   │   └── api.ts                # REST API 端点
│   ├── observer/
│   │   ├── event-stream.ts       # SSE 订阅 + 事件路由
│   │   └── evaluator.ts          # 目标评估逻辑
│   └── webui/
│       ├── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── TreeView.tsx     # 未使用，内联在 App 中
│       │   │   ├── StreamConsole.tsx
│       │   │   ├── Timeline.tsx
│       │   │   └── ControlBar.tsx
│       │   └── hooks/
│       │       └── useWebSocket.ts
│       └── vite.config.ts
```

## 核心数据结构

```typescript
interface TaskState {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  dependsOn: string[]           // DAG 依赖 ID
  session?: SessionInfo         // 如果正在运行的 ACP 会话
  retryCount: number
  result?: TaskResult
}

interface TaskResult {
  summary: string
  artifacts: string[]           // 变更/创建的文件
  cost: number
  tokens: TokenUsage
}

interface AgentState {
  taskId: string
  sessionId: string
  status: 'creating' | 'running' | 'idle' | 'error'
  stream: string[]               // 缓存 SSE text delta
  startTime: number
}

interface WorkspaceState {
  goals: string[]
  tasks: Map<string, TaskState>
  running: Map<string, AgentState>
  dag: DAG<TaskState>
  budget: { spent: number; limit: number }
}
```

## 数据流（Phase 1）

```
1. 启动
   main()
   ├── createOpencode() → { client, server }
   ├── startHttpServer() → Fastify on :3000
   └── serveWebUI() → Vite :5173 (dev) 或 static (prod)

2. 用户通过 WebUI 提交任务
   WebUI → WS → Fastify → createSession()
   ├── client.session.create({agent, model})
   ├── client.session.prompt({sessionID, parts})
   ├── subscribeEvents(sessionId)
   └── return sessionId → WebUI

3. 事件流
   SSE 事件到达
   ├── session.next.text.delta → 缓存 → WS → WebUI
   ├── session.next.tool.called → WS → WebUI（工具名）
   ├── session.next.shell.started → WS → WebUI
   ├── permission.asked → 权限队列 → WS → WebUI
   ├── question.asked → 问题队列 → WS → WebUI
   └── session.idle → 触发评估

4. 评估
   idle 事件
   ├── client.session.messages({sessionId})
   ├── client.session.diff({sessionId})
   ├── (可选) client.vcs.diff({mode:"git"})
   └── 标记任务完成 → 更新树
```

## 三档权限策略

```typescript
type PermissionLevel = 'trusted' | 'safe' | 'strict'

const PERMISSION_RULES: Record<PermissionLevel, PermissionRuleset> = {
  trusted: [
    { permission: '*', pattern: '**', action: 'allow' }  // 完全信任
  ],
  safe: [
    { permission: 'read', pattern: '**', action: 'allow' },
    { permission: 'edit', pattern: '**', action: 'allow' },
    { permission: 'bash', pattern: '**', action: 'allow' },
    // 危险操作需审批
    { permission: 'bash', pattern: 'rm -rf *', action: 'ask' },
    { permission: 'bash', pattern: 'git push *', action: 'ask' },
  ],
  strict: [
    { permission: '*', pattern: '**', action: 'ask' }    // 全审批
  ]
}
```

## 错误处理

- 子 Agent 超时：默认 10 分钟，中止会话 → 重试
- 重试：最多 10 次（可配置），每次用不同方法
- 崩溃恢复：重启时读取 OpenSpec tasks.md 状态
- SSE 断连：自动重连 + 退避
