# 24h Agent Orchestrator — AI 知识库

## 约定与规范

### 规则 1：中文优先
- git commit message 使用中文：`<type>: 中文描述`（如 `feat: 添加用户登录功能`）
- 输出的所有文档、注释、报告、日志尽可能使用中文，方便我阅读；但代码标识符使用英文

### 规则 2：研发流程：
- **类型判断**：
1、如果是新需求，则走新需求流程，比如：新需求：添加工具栏 or 新需求：xxx
2、如果是bug修改，则走 bug 修改流程，比如：bug修复，修复 xxx

#### 新需求流程：
步骤 0：加载 skill("using-superpowers")，声明进入实施工作流；
步骤 1: 需求规划 → OpenSpec 技能（`/opsx-propose` 创建 proposal/design/tasks）；
步骤 2: 确认关卡：tasks 创建后必须用 Question 工具展示给用户，确认后才能继续；
步骤 3: 代码实现+验证归档** → Superpowers 技能（通过 opencode skill 系统加载）；
步骤 4: 读取 openspec tasks.md / design.md / proposal.md；
步骤 5: 为每个产生代码的 task 必须按以下 micro-cycle 执行：
 subagent-driven-development → 测试驱动开发
    │    ├── 创建子 agent (实现 + 测试 + 提交 + 自审)
    │    ├── 测试用例编写和测试代码编写
    │    ├── 根据任务描述实现代码
    │    ├── 测试用例和测试代码验证
    │    ├── 确认测试完全通过，则进行继续，否则修正代码错误    
    │    ├── 规范审查 (代码是否符合 spec)
    │    └── 代码质量审查 (代码质量)
    │
    ▼
 verification-before-completion → 验证后再声称完成
    │
    ▼
finishing-a-development-branch → 合并/PR/保留/放弃
    │
    ▼
推送到远程仓库 git commit（中文）
    │
    ▼
标记 task 为 [x] 

#### Bug 修改流程：
- **bug规划** 使用 Superpowers skill('systematic-debugging') 进行 bug 修复；
- **代码实现+验证归档** → Superpowers 技能
遇到 Bug / 测试失败
    │
    ▼
systematic-debugging
    ├── Phase 1: 根因调查
    ├── Phase 2: 模式分析
    ├── Phase 3: 假设与验证
    └── Phase 4: 实施 (创建测试用例和测试代码 → 修复 → 验证)
    │
    ▼
verification-before-completion → 提交 + 推送

### 规则 3：Code Review 流程：
使用 Superpowers 技能，在开发完成后
步骤 1: 创建 Code Review 需求
    │
    ▼
requesting-code-review → 派发审查子 agent
    │
    ▼
收到反馈 → receiving-code-review
    ├── 理解 → 验证 → 评估
    ├── 正确: 修复
    └── 不正确: 有理有据反驳
    │
    ▼
verification-before-completion → finishing-a-development-branch

### 规则 4：每次任务完成需要完善执行日志 & 报告格式
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

### 规则 5：反例库

以下是被记录的实际跳过案例，每次开工前必须重读：

| 案例 | 跳过的步骤 | 后果 | 日期 |
|---|---|---|---|
| Phase 3 持久化+调度 | 未加载 `using-superpowers`、未走 TDD 循环（先写实现后补测试）、未做 Code Review | 花大量时间修测试类型错误，代码质量无正式把关 | 2026-05-24 |
| WebUI 全面升级 | 加载了 TDD skill 但未执行逐 task 的 Red→Green→Refactor 循环；7 个任务组一次性批量提交，未逐个验证；3.3 和测试组仍为 [ ] 但已声称完成 | 前端的测试缺失，部分功能 (cron 预览) 未完成 | 2026-05-24 |

### 规则 6：代码规范
- **注释**：关键代码、逻辑需注释说明意图，但避免逐行啰嗦。
- **风格**：TypeScript 严格模式，ESNext 目标
- **结构**：模块化，独立文件，无全局变量污染
- **测试**：单元/集成/E2E 测试优先级高于文档
- **产物目录**：openspec 规划 → `openspec/changes/`，superpowers 执行 → `superpowers/`


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