# 24h Agent Orchestrator — AI 知识库

## 项目概述

24h Agent Orchestrator 是一个基于 opencode ACP 协议的 24/7 自主 Agent 编排系统。它将 OpenSpec 的规划能力与 opencode 的子 Agent 调度能力结合，实现从目标定义 → 任务分解 → 子 Agent 分发 → 实时观测 → 结果评估的完整自动化闭环。

核心能力：
- 通过 opencode ACP 协议创建和管理子 Agent 会话
- 实时 SSE 事件流订阅与广播
- 三层权限控制（trusted / safe / strict）
- 资源配置与预算限制
- WebUI 可视化树状任务视图 + 流式日志

---

## 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| 运行环境 | Node.js + TypeScript (ESNext) | 类型安全，opencode SDK 原生支持 |
| HTTP/WS 服务 | Fastify + @fastify/websocket + @fastify/static | 高性能服务端，内置 WS 支持，静态文件服务 |
| SDK | @opencode-ai/sdk (v2) | ACP 协议客户端、SSE 流订阅 |
| 前端 | React 19 + Vite 6 | 实时交互式 WebUI |
| 树状视图 | react-arborist | 任务树可视化 |
| 构建工具 | tsc + vite build | TypeScript 编译 + 前端打包 |
| 测试框架 | vitest | 单元测试与集成测试 |

---

## 目录结构

```
24h-agent-orchestrator/
├── package.json            # 依赖、脚本定义
├── tsconfig.json           # TypeScript 编译配置（src/ 编译到 dist/）
├── src/
│   ├── index.ts            # 入口：启动 opencode 服务 + Fastify + WebUI
│   ├── orchestrator/       # 编排核心层
│   │   ├── core.ts         # Orchestrator 类：任务管理、分派、重试、预算
│   │   ├── acp-manager.ts  # ACP 会话封装：创建、发 prompt、获取消息/diff、中止
│   │   └── types.ts        # 共享类型定义（TaskState, AgentState, TimelineEntry 等）
│   ├── server/             # 服务层
│   │   ├── __tests__/
│   │   │   └── http.test.ts # HTTP 服务测试（GET /、health、API、SPA 回退）
│   │   ├── http.ts         # Fastify 服务器创建，注册路由 + WS + 静态文件
│   │   ├── websocket.ts    # WebSocket 处理 + 广播回调
│   │   └── api.ts          # REST API 路由（状态、任务、配置）
│   ├── observer/           # 观测层
│   │   ├── event-stream.ts # 全局 SSE 事件订阅、按类型路由
│   │   └── evaluator.ts    # 任务完成评估（读取消息 + diff）
│   └── webui/              # React 前端
│       ├── index.html
│       ├── vite.config.ts  # Vite 配置，代理 /api 和 /ws 到 :3000
│       ├── tsconfig.json
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/ # TreeView, StreamConsole, Timeline, ControlBar
│           └── hooks/      # useWebSocket 钩子
```

---

## 核心架构

### Orchestrator（编排器）

位于 `src/orchestrator/core.ts`，是整个系统的核心。主要职责：

- **任务管理**：维护 `Map<string, TaskState>`，支持 add / dispatch / abort
- **Agent 管理**：维护 `Map<string, AgentState>`，跟踪每个子会话状态
- **事件驱动**：通过 SSE 订阅监听子 Agent 生命周期（text delta / idle / error）
- **重试机制**：任务失败自动重试（默认最多 10 次）
- **预算控制**：`budgetSpent / budgetLimit` 防止资源超支
- **并行限制**：`maxParallel` 控制并发数

### ACP Manager（会话管理）

位于 `src/orchestrator/acp-manager.ts`，封装 opencode SDK 的 ACP 调用：

- `createOpencodeServer()` — 启动 ACP 服务（127.0.0.1:4096）
- `createSubAgentSession()` — 创建子会话，注入权限规则
- `sendTaskPrompt()` — 向会话发送任务 prompt
- `getSessionMessages()` / `getSessionDiff()` — 拉取结果
- `abortSession()` — 强制中止会话

### Observer（观测层）

位于 `src/observer/`，负责实时数据采集：

- **event-stream.ts**：订阅 `client.global.event()` 的 SSE 流，按事件类型（text delta / tool called / shell started / idle / error）路由到对应回调
- **evaluator.ts**：会话 idle 后拉取 messages + diff，计算 cost、提取 summary 和 artifacts

### Server（服务层）

位于 `src/server/`，对外暴露接口：

- **http.ts**：Fastify 实例，注册 WS 和 API 路由，通过 `@fastify/static` 提供前端静态文件服务，SPA 回退到 `index.html`
- **websocket.ts**：`/ws` 端点，维护客户端 Map，双向通信；提供 `createBroadcastCallbacks()` 将 orchestrator 事件广播到所有 WS 客户端
- **api.ts**：REST 端点（`GET /api/state`、`POST /api/task`、`POST /api/task/:taskId/dispatch`、`POST /api/task/:taskId/abort`、配置端点）

### WebUI（前端）

位于 `src/webui/`，React 单页应用：

- **useWebSocket hook**：连接后端 WS，自动重连，收发 JSON 消息
- **TreeView**：任务树状图，展示状态 + dispatch/abort 按钮
- **StreamConsole**：实时展示会话的 text delta
- **Timeline**：事件时间线，按 source 着色（main / sub / system / user）
- **ControlBar**：权限选择、预算设置、任务创建
- **语言**：多语言支持，默认用中文

---

## 关键数据流

### 任务提交与执行

```
WebUI (React)
   │  dispatchTask(taskId)
   ▼
WebSocket (ws://localhost:3000/ws)
   │  { type: "dispatch-task", taskId }
   ▼
Fastify  →  Orchestrator.dispatchTask()
   │
   ├── client.session.create()          → 创建子会话
   │      └── 返回 sessionId
   ├── client.session.prompt()          → 发送任务 prompt
   │
   ▼
子 Agent (opencode ACP)
   │  SSE 事件流（global.event()）
   ▼
Observer (event-stream.ts)
   │  onTextDelta → buffer → broadcast
   │  onSessionIdle → evaluate
   ▼
Orchestrator.handleSessionComplete()
   │
   ├── evaluator.ts → getSessionMessages + getSessionDiff
   ├── 更新 TaskState (completed)
   └── broadcast state-update → WebUI
```

### 实时事件推送

```
opencode SSE stream
   ↓
event-stream.ts switch(type):
   ├── session.next.text.delta  → onStreamDelta → WS broadcast
   ├── session.next.tool.called → onTimeline    → WS broadcast
   ├── session.next.shell.started → onTimeline  → WS broadcast
   ├── session.idle             → handleSessionComplete
   └── session.error            → handleSessionError → retry
```

### 权限控制模型

三种级别，在创建子会话时注入：
- **trusted**：允许所有操作（`permission: *`）
- **safe**（默认）：允许读写、bash、question 等，危险操作需确认
- **strict**：所有操作都需人工确认（`permission: *, action: ask`）

---

## 开发模式

```bash
# 开发模式（后端热重载）
npm run dev        # tsx watch src/index.ts

# 编译后端 + 构建前端
npm run build      # tsc && vite build src/webui

# 生产启动
npm run start      # node dist/index.js

# 类型检查
npm run typecheck  # tsc --noEmit


# 运行测试
npm run test       # vitest run

# 监听模式测试
npm run test:watch # vitest
```

开发时前端通过 Vite 代理（`localhost:5173` → `localhost:3000`）访问后端 API 和 WebSocket，无需手动配置跨域。

---

## 约定与规范

- **文档规则**：
1、生成文档和输出内容应使用中文：所有文档、注释、输出内容默认使用中文，便于团队理解。
2、注释使用中文，注释内容使用英文。
3、需求和任务遵循openspec技能要求放在openspec目录中，任务执行报告和执行日志遵循superpowers技能要求放入superpowers目录中。
- **新增代码需要添加核心必要注释，避免啰嗦**：关键逻辑（如状态转换、异步流程、重试策略）需要注释说明意图，但避免逐行啰嗦注释。保持代码自描述，只在"为什么这样写"而非"在做什么"时加注释。
- **代码风格**：使用 TypeScript 严格模式，严格遵循 TypeScript 官方风格指南。
- **代码结构**：模块化设计，每个功能模块应独立文件，避免全局变量污染。
- **测试**：单元测试、集成测试、端到端测试，优先级高于文档。
- **任务执行要求**: 需求拆分和任务拆解用openspec技能，代码生成和bug修改、codereivew用superpowers技能。每次任务完成必须填写任务执行报告以及任务执行日志等相关文件，并需要提交代码到git仓库。任务报告文件格式要求 yyyy-mm-dd-<任务描述>.md,任务日志文件需要有完整的变更记录登记。任务登记内容格式：yyyyyy-mm-dd-<任务描述>：任务概述、任务报告文件的相对路径及文件名。
