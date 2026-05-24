# 24h Agent Orchestrator — AI 知识库

## 项目概述

基于 opencode ACP 协议的 24/7 自主 Agent 编排系统。从目标定义 → 任务分解 → 子 Agent 分发 → 实时观测 → 结果评估的完整自动化闭环。

核心能力：ACP 子 Agent 管理、SSE 实时事件流、三层权限控制（trusted/safe/strict）、预算控制、WebUI 可视化。

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Node.js + TypeScript (ESNext) |
| HTTP/WS | Fastify + @fastify/websocket |
| SDK | @opencode-ai/sdk (v2) |
| 前端 | React 19 + Vite 6 |
| 测试 | vitest + Playwright |

## 目录结构

```
24h-agent-orchestrator/
├── src/
│   ├── index.ts                  # 入口
│   ├── orchestrator/             # 编排核心
│   │   ├── core.ts, acp-manager.ts, types.ts
│   ├── server/                   # HTTP/WS 服务
│   │   ├── http.ts, websocket.ts, api.ts
│   ├── observer/                 # 观测层
│   │   ├── event-stream.ts, evaluator.ts
│   └── webui/                    # React 前端
├── openspec/changes/             # OpenSpec 规划产物
├── superpowers/                  # 执行报告/日志
│   ├── execution-logs/
│   └── execution-reports/
```

## 核心架构

- **Orchestrator** (`core.ts`): 任务管理（add/dispatch/abort）、Agent 状态追踪、SSE 事件驱动、自动重试、预算与并行控制
- **ACP Manager** (`acp-manager.ts`): 封装 SDK 调用（session create/prompt/messages/diff/abort），注入权限规则
- **Observer** (`event-stream.ts`, `evaluator.ts`): 全局 SSE 订阅按事件类型路由，idle 后拉取消息+diff 评估结果
- **Server** (`http.ts`, `websocket.ts`, `api.ts`): Fastify + WebSocket + REST API，广播回调自动推送到 WebUI
- **WebUI**: React SPA，任务树 + 流式控制台 + 时间线 + 控制栏，国际化中英文支持

## 开发模式

```bash
npm run dev        # tsx watch src/index.ts
npm run build      # tsc && vite build src/webui
npm run start      # node dist/index.js
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run test:e2e   # playwright test (需先 build)
```

## 约定与规范

### 规则 1：中文优先
- git commit message 使用中文：`<type>: 中文描述`（如 `feat: 添加用户登录功能`）
- 所有注释/报告/日志使用中文；代码标识符使用英文

### 规则 2：双阶段分工
- **需求规划** → OpenSpec 技能（`/opsx-propose` 创建 proposal/design/tasks）
- **确认关卡**：tasks 创建后必须用 Question 工具展示给用户，确认后才能继续
- **代码实现+验证归档** → Superpowers 技能（插件路径 `D:/AIGPT/superpowers`）

### 规则 3：Superpowers 实施工作流（强制）
进入 `/opsx-apply` 后，按以下顺序执行：

```
步骤 0: 加载 skill("using-superpowers")，声明进入实施工作流
步骤 1: 读取 openspec tasks.md / design.md / proposal.md
步骤 2: 按类型执行工作流
  ├─ 新需求 → skill("test-driven-development") → Red → Green → Refactor
  ├─ Bug    → skill("systematic-debugging") → 根因调查 → 重现 → 修复
  └─ 模糊   → skill("brainstorming") → 设计方案 → 用户确认
步骤 3: 验证链（顺序执行，失败不得跳过）→ typecheck → build → test
步骤 4: Code Review → 加载 skill("verification-before-completion")
步骤 5: 归档 → 日志 + 报告 + git commit（中文）
```

### 规则 4：执行日志 & 报告格式
- 文件名：`superpowers/execution-{logs,reports}/yyyy-mm-dd-<kebab-英文>.md`
- **日志**（概要登记）：
  ```markdown
  # <日期-描述> — 执行日志
  ## 任务登记
  - **日期**: yyyy-mm-dd | **任务描述**: <中文> | **任务概述**: <2-3句>
  - **报告文件**: superpowers/execution-reports/<同名文件>.md
  ```
- **报告**（详细过程）：
  ```markdown
  # <日期-描述> — 执行报告
  ## 变更概览（名称/日期/关联openspec/耗时）
  ## 执行时间线（逐阶段步骤、决策、结果）
  ## 验证结果（typecheck/build/test/coverage/e2e 表）
  ## 变更文件清单（新增/修改）
  ```

### 规则 5：代码规范
- **注释**：关键逻辑需注释说明意图，避免逐行啰嗦。只写"为什么这样写"，不写"在做什么"
- **风格**：TypeScript 严格模式，ESNext 目标
- **结构**：模块化，独立文件，无全局变量污染
- **测试**：单元/集成/E2E 测试优先级高于文档
- **产物目录**：openspec 规划 → `openspec/changes/`，superpowers 执行 → `superpowers/`
