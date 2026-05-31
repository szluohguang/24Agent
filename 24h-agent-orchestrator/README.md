# 24h Agent Orchestrator

基于 opencode ACP 协议的 24/7 自主 Agent 编排系统。连接 OpenSpec 规划、子 Agent 分发、实时观测与目标评估，形成完整自动化闭环。

## 架构总览

```
主 Agent (Node.js + WebUI)
├── OpenSpec CLI → 目标 / 规格 / 任务
├── @opencode-ai/sdk → ACP server + client
│   ├── session.create() → 每任务一个子会话
│   ├── session.prompt() → 分发任务
│   ├── global.event() SSE → 实时流
│   └── session.messages() / diff() → 结果收集
├── DAG 调度器 → 依赖感知并行分发
├── 观测引擎 → 事件处理 + 目标评估
├── 弹性层 → 重试、超时、预算控制
└── WebUI → 树形视图、流式控制台、权限管理
```

## 核心数据流

```
WebUI → WS → Fastify → Orchestrator.dispatchTask()
  ├── client.session.create()     ← 创建子 Agent 会话
  ├── client.session.prompt()     ← 发送任务
  │
  ▼
子 Agent (opencode ACP) 执行中
  │  SSE 事件流实时推送
  ▼
Observer 按事件类型路由：
  ├── text.delta   → WebUI 流式展示
  ├── tool.called  → 时间线记录
  ├── session.idle → 触发结果评估
  └── session.error → 触发重试
```

## 功能特性

- **ACP 协议集成** — 基于 `@opencode-ai/sdk` 原生管理子 Agent 会话
- **实时流式输出** — 通过 SSE 订阅子 Agent 执行过程，毫秒级推送 WebUI
- **三档权限控制** — trusted（全自动）/ safe（危险操作拦截）/ strict（全审批）
- **任务生命周期** — pending → running → completed/failed，支持中止和重试
- **自动重试** — 失败任务最多重试 10 次（可配置），超过上限标记失败
- **预算控制** — 追踪总 token 消耗，超限自动暂停
- **WebUI 仪表盘** — 任务树、流式控制台、事件时间线、权限配置
- **崩溃恢复** — 重启时读取 OpenSpec 任务状态自动恢复

## 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch
```

## 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 22
- [opencode CLI](https://opencode.ai) 已安装并配置好 AI 提供商

### 安装

```bash
cd 24h-agent-orchestrator
npm install
```

### 运行

```bash
# 开发模式（tsx watch 热重载）
npm run dev

# 浏览器打开 http://localhost:3000
```

### 构建

```bash
# 编译后端 + 构建前端
npm run build

# 生产启动
npm run start
```

## WebUI 使用

启动后访问 `http://localhost:3000`，界面分为三个区域：

```
┌────────────────────────────────────────────────────┐
│  标题栏: 状态概览 (任务数 / 活跃数)                │
├───────────┬────────────────────────────────────────┤
│           │                                        │
│ 任务树    │ Stream Console  |  Timeline            │
│           │                                        │
│ ○ task-1  │ [abc123] task-1                        │
│ ● task-2  │ 正在读取 design.md...                  │
│ ✓ task-3  │ 正在实现 POST /api/users/register...   │
│ ✗ task-4  │ 创建文件: src/routes/auth.ts           │
│           │                                        │
│           │ 时间线:                                │
│           │ 12:00  main  分发: task-1              │
│           │ 12:01  sub   工具: writeFile           │
│           │ 12:02  system 会话 idle: abc123        │
├───────────┴────────────────────────────────────────┤
│  控制栏: ● Connected  [Safe ▼] [New task...] [Add] │
└────────────────────────────────────────────────────┘
```

1. **任务树** — 左侧面板展示所有任务及其状态。点击任务可选中查看详情
2. **Stream Console** — 选中子 Agent 后实时显示其流式输出
3. **Timeline** — 按时间线记录所有事件（任务分发、工具调用、完成/失败）
4. **控制栏** — 连接状态指示、权限级别切换、新增任务

### 权限级别

| 级别 | 说明 | 适用场景 |
|------|------|---------|
| Trusted | 全自动，无人工干预 | 信任的项目，完全无人值守 |
| Safe | 自动执行，危险操作需审批 | 日常 24h 运行（默认） |
| Strict | 每一步操作都需确认 | 高价值项目，全程监督 |

## 项目结构

```
src/
├── index.ts                  # 入口：启动 ACP 服务 + HTTP 服务器
├── orchestrator/             # 编排核心层
│   ├── core.ts               # Orchestrator 主循环
│   ├── acp-manager.ts        # ACP 会话封装
│   └── types.ts              # 共享类型定义
├── server/                   # 服务层
│   ├── __tests__/
│   │   └── http.test.ts      # HTTP 服务测试
│   ├── http.ts               # Fastify 服务器（含静态文件服务）
│   ├── websocket.ts          # WebSocket 通信
│   └── api.ts                # REST API 路由
├── observer/                 # 观测层
│   ├── event-stream.ts       # SSE 事件订阅
│   └── evaluator.ts          # 结果评估
└── webui/                    # React 前端
    ├── index.html
    ├── vite.config.ts
    ├── dist/                  # 构建产物
    └── src/
        ├── App.tsx           # 主组件（三面板布局）
        ├── hooks/            # 自定义钩子
        └── components/       # UI 组件
```

## 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| 运行环境 | Node.js + TypeScript | 类型安全，SDK 原生支持 |
| HTTP/WS | Fastify + @fastify/websocket + @fastify/static | 高性能服务端，静态文件服务 |
| ACP 客户端 | @opencode-ai/sdk | 类型化 ACP 客户端 + SSE |
| 前端 | React 19 + Vite 6 | 实时交互式 WebUI |
| 构建 | tsc + vite build | 编译打包 |
| 测试 | vitest | 单元测试与集成测试 |

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npm run typecheck

# 运行测试
npm test

# 监听模式测试开发
npm run test:watch

# 前端独立开发（需要后端在 3000 端口运行）
cd src/webui && npx vite

# 前端开发时通过 Vite 代理访问后端 API 和 WS
```

## 路线图

- **Phase 1** ✅ 项目骨架、SDK 集成、WebUI 基础、单任务分发
- **Phase 2** ✅ DAG 调度器、OpenSpec 集成、结果评估、TDD 测试体系
- **Phase 3** ✅ 弹性能力（重试、超时、预算、持久化、健康监控、自动恢复）
- **Phase 4 — 人机协作** ✅ 人工审核工作流、中英文国际化、WebUI 全面升级
- **Phase 4 — 历史记录** ✅ 完整 SQLite 持久化审计日志、时间线可视化（待 WebUI 历史页面）
- **Phase 4 — 通知系统** 🔜 Webhook 通知、任务状态回调
- **Future** 🔜 用户认证、多租户、生产部署配置（Docker）

## 许可

MIT
