# 24h Agent Orchestrator

基于 opencode ACP 协议的 24/7 自主 Agent 编排系统。连接 OpenSpec 规划、子 Agent 分发、实时观测与目标评估，形成完整自动化闭环。

## 架构总览

```
主 Agent (Node.js + WebUI)
├── OpenSpec CLI → 目标 / 规格 / 任务
├── @opencode-ai/sdk → ACP server + client
│   ├── session2.create() → 每任务一个子会话
│   ├── session2.prompt() → 分发任务
│   ├── global.event() SSE → 实时流
│   └── session2.messages() / diff() → 结果收集
├── DAG 调度器 → 依赖感知并行分发
├── 观测引擎 → 事件处理 + 目标评估
├── 弹性层 → 重试、超时、预算控制
└── WebUI → 对话式控制台、健康面板、配置管理
```

## 功能特性

- **ACP 协议集成** — 基于 `@opencode-ai/sdk` v2 原生管理子 Agent 会话
- **对话式流式控制台** — 类 ChatGPT 界面：思考过程（可折叠）、工具调用、AI 回复、用户追问
- **继续提问** — 选中有 session 的任务时输入框始终可见，追问发送到当前 ACP 会话
- **三档权限控制** — trusted（全自动）/ safe（危险操作拦截）/ strict（全审批）
- **任务生命周期** — pending → running → completed/failed，支持中止和重试
- **自动重试** — 失败任务最多重试 10 次（可配置），超过上限标记失败
- **预算控制** — 基于 DeepSeek V4 Flash 定价（1元/百万输入 + 2元/百万输出），超限自动暂停
- **健康监控** — Agent 去重显示、实时心跳、任务描述识别
- **WebUI 仪表盘** — 对话式控制台、健康面板、定时任务、Webhook 配置、系统配置
- **崩溃恢复** — 重启时自动恢复未完成任务
- **日志按天切换** — 自动检测跨天并创建新日志文件

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

# 或使用启动脚本（自动构建 WebUI）
start-orchestrator.bat    # Windows
start-orchestrator.ps1    # PowerShell

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
│  标题栏: ⚡ 24h Agent   [English] [●Connected]     │
├───────────┬────────────────────────────────────────┤
│           │                                        │
│ 任务树    │ 对话式控制台                            │
│           │                                        │
│ ○ 任务1   │ ┌──────────────────────────────┐      │
│ ● 任务2   │ │ 👤 你                    12:00│      │
│ ✓ 任务3   │ │ 深圳天气如何？              │      │
│           │ └──────────────────────────────┘      │
│           │ ┌──────────────────────────────┐      │
│           │ │ 🧠 ▶ 思考过程               │      │
│           │ └──────────────────────────────┘      │
│           │ ┌──────────────────────────────┐      │
│           │ │ 🔧 bash              执行中  │      │
│           │ └──────────────────────────────┘      │
│           │ ┌──────────────────────────────┐      │
│           │ │ 🤖 AI 回复              12:01│      │
│           │ │ 深圳今天天气晴朗...          │      │
│           │ └──────────────────────────────┘      │
│           │                                      │
│           │ [继续提问...              ] [发送]   │
├───────────┴────────────────────────────────────────┤
│  控制栏: ● Connected  [Safe ▼] [输入任务...] [添加] │
└────────────────────────────────────────────────────┘
```

1. **任务树** — 左侧面板展示所有任务及其状态。悬停高亮外框，选中高亮背景
2. **对话式控制台** — 类 ChatGPT 界面，区分思考/工具/回复/追问，支持继续提问
3. **健康面板** — 右侧显示 Agent 健康状态、任务统计、预算进度
4. **控制栏** — 连接状态、权限级别、创建任务
5. **设置弹窗** — 定时任务管理 / 审计历史 / Webhook / 系统配置（预算修改、清零）

### 权限级别

| 级别 | 说明 | 适用场景 |
|------|------|---------|
| Trusted | 全自动，无人工干预 | 信任的项目，完全无人值守 |
| Safe | 自动执行，危险操作需审批 | 日常 24h 运行（默认） |
| Strict | 每一步操作都需确认 | 高价值项目，全程监督 |

## 测试

```bash
# 单元测试
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage

# E2E 黑盒测试（需先构建 WebUI）
npm run test:e2e

# 黑盒浏览器测试（需先启动服务）
npx playwright test --config src/webui/e2e/playwright-blackbox.config.ts
```

### 测试用例文档

参见 `tests/testcase/` 目录，包含 16 个黑盒 UI 操作用例文件，覆盖任务生命周期、定时任务管理、审核流程、国际化等全部用户操作路径。

## 费用计算

费用按 **DeepSeek V4 Flash** 定价计算（人民币）：

| 项目 | 价格 |
|------|------|
| 输入（缓存未命中） | 1元/百万 tokens |
| 输出 | 2元/百万 tokens |

可在设置 → 系统配置中修改预算上限和清零已花费。

## 项目结构

```
24h-agent-orchestrator/
├── src/
│   ├── index.ts                   # 入口：启动 ACP + HTTP 服务器
│   ├── orchestrator/              # 编排核心层
│   │   ├── core.ts                # Orchestrator 主循环
│   │   ├── acp-manager.ts         # ACP 会话封装（session2 API）
│   │   ├── types.ts               # 共享类型定义
│   │   ├── store.ts               # SQLite 持久化
│   │   ├── database.ts            # 数据库初始化
│   │   ├── scheduler.ts           # DAG 调度器
│   │   ├── health-monitor.ts      # 会话健康监控
│   │   ├── recovery.ts            # 崩溃恢复
│   │   └── logger.ts              # 结构化日志（按天切换）
│   ├── server/
│   │   ├── http.ts                # Fastify 服务器
│   │   ├── websocket.ts           # WebSocket 通信
│   │   ├── api.ts                 # REST API 路由
│   │   └── notifier.ts            # Webhook 通知
│   ├── observer/
│   │   ├── event-stream.ts        # SSE 事件订阅（v2 格式）
│   │   └── evaluator.ts           # 结果评估（成本计算）
│   ├── test-utils/
│   │   └── factories.ts           # 测试 Mock 工厂
│   └── webui/
│       ├── index.html
│       ├── vite.config.ts
│       ├── e2e/                   # Playwright E2E 测试
│       │   ├── specs/             # 测试规格
│       │   └── playwright-blackbox.config.ts
│       └── src/
│           ├── App.tsx            # 主组件
│           ├── types.ts           # 前端类型
│           ├── i18n/              # 中英文国际化
│           ├── hooks/
│           │   └── useWebSocket.ts
│           └── components/        # UI 组件
│               ├── TreeView.tsx          # 任务树
│               ├── StreamConsole.tsx     # 对话式控制台
│               ├── HealthDashboard.tsx   # 健康面板
│               ├── SystemOverview.tsx    # 系统概览（含预算进度条）
│               ├── ReviewPanel.tsx       # 审核面板
│               ├── ScheduleManager.tsx   # 定时任务管理
│               └── WebhookManager.tsx    # Webhook 配置
├── tests/
│   └── testcase/                  # 黑盒测试用例文档
├── start-orchestrator.bat         # Windows 启动脚本（自动构建）
├── start-orchestrator.ps1         # PowerShell 启动脚本
└── data/                          # SQLite 数据库文件
```

## 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| 运行环境 | Node.js + TypeScript | 类型安全 |
| HTTP/WS | Fastify + @fastify/websocket | 高性能服务端 |
| ACP 客户端 | @opencode-ai/sdk v2 | 类型化 ACP 客户端 + SSE |
| 前端 | React 19 + Vite 6 | 实时交互式 WebUI |
| 数据库 | better-sqlite3 | 任务/Agent/事件持久化 |
| 测试 | vitest + Playwright | 单元 + E2E 黑盒测试 |

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npm run typecheck

# 运行测试
npm test

# 构建前端
npm run build
```

## 路线图

- **Phase 1** ✅ 项目骨架、SDK 集成、WebUI 基础
- **Phase 2** ✅ DAG 调度器、结果评估、TDD 测试体系
- **Phase 3** ✅ 弹性能力（重试/预算/持久化/健康监控/恢复）
- **Phase 4 — 人机协作** ✅ 人工审核、国际化、WebUI 升级
- **Phase 4 — 通知系统** ✅ Webhook 通知
- **Phase 5 — 对话 UI** ✅ 类 ChatGPT 界面、继续提问、思考折叠
- **Phase 6 — 质量工程** ✅ 黑盒测试体系、健康面板修复、费用计算
- **Future** 🔜 用户认证、多租户、RBAC 权限

## 许可

MIT
