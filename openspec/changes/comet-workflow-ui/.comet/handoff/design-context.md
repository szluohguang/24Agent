# Comet Design Handoff

- Change: comet-workflow-ui
- Phase: design
- Mode: compact
- Context hash: 245ea392f1cfc1ab73773e4e8618d222c56ab17f3bd5b7dc76c4a967229f931c

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/comet-workflow-ui/proposal.md

- Source: openspec/changes/comet-workflow-ui/proposal.md
- Lines: 1-52
- SHA256: 8eda87ad1e2aeabbec6aac96c81bb252bf12200eb617c990f59f03ec96d0f0f9

```md
## Why

24h-agent-orchestrator 目前仅支持基础的任务调度（/task、/project 等 slash 命令），缺乏对 Comet（OpenSpec + Superpowers）双星开发流程的原生 UI 支持。更关键的是，Comet 流程控制当前依赖模型（AI agent）阅读自然语言 skill 描述后自行遵循，存在以下根因问题：

- **模型泛化不确定性**：同一条流程规则，不同模型/版本理解执行不一致
- **流程状态丢失**：agent 在长对话中容易丢失当前阶段上下文，跳步、漏步频发
- **无强制约束**：skill 的"应该/必须"描述无代码层面强制力，agent 可选择性忽略
- **不可编排**：流程硬编码在 prompt 中，无法手动调整或自动化编排

本次变更引入**流程编排引擎**，将 Comet 流程控制从自然语言描述迁移为：
1. **JSON 流程编排文件** — 明确定义阶段、转换、守卫、决策点
2. **代码强制约束** — 编排引擎执行流程，而非模型"理解"流程
3. **代码+状态双重验证** — 每次阶段转换同时通过 guard 脚本和状态机校验
4. **三面板 UI** — 可视化展示编排状态

## What Changes

- **流程编排引擎**：新增 `comet-engine/` 模块，包含编排器、状态机、守卫调度器
- **JSON 编排文件**：定义 Comet 五阶段（open → design → build → verify → archive）的转换规则、前置条件、守卫脚本、决策点
- **Comet 命令路由**：扩展 slash 命令系统，通过编排引擎分发任务
- **智能命令推断**：agent 推断命令类型后由编排引擎校验合法性
- **左侧面板改为阶段编排视图**：展示编排引擎的当前阶段、转换路径、任务状态
- **中间控制台增强**：增加决策交互，编排引擎的决策点直接渲染为 UI 控件
- **右侧面板改为 Comet 引擎状态监控**：预算一行，其余展示引擎状态

## Capabilities

### New Capabilities
- `comet-orchestration-engine`: Comet 流程编排引擎，包含编排器、JSON schema、状态机、守卫调度
- `comet-engine-ui-panels`: 编排引擎驱动的 WebUI 三面板展示

### Modified Capabilities
- _(无，本次为全新能力)_

## Impact

- **新增 `src/comet-engine/`** — 编排引擎核心目录
- **新增 `src/comet-engine/orchestrator.ts`** — 编排器核心：读取 JSON 编排文件，驱动阶段转换
- **新增 `src/comet-engine/state-machine.ts`** — 状态机：基于 .comet.yaml 的状态转换验证
- **新增 `src/comet-engine/guard-scheduler.ts`** — 守卫调度器：调用 comet-guard.sh 等脚本
- **新增 `src/comet-engine/types.ts`** — 编排引擎类型定义
- **新增 `comet-orchestration.json`** — 流程编排定义文件（项目根目录）
- **新增「更新插件」按钮** — Settings 页面增加按钮，从上游仓库更新 openspec、superpowers 及相关 skill
- **24h-agent-orchestrator/src/slash/index.ts** — 扩展命令路由，指向编排引擎
- **24h-agent-orchestrator/src/server/api.ts** — 新增编排状态 API、插件更新 API
- **24h-agent-orchestrator/src/webui/src/App.tsx** — 修改布局
- **24h-agent-orchestrator/src/webui/src/components/TreeView.tsx** — 改造为编排阶段视图
- **24h-agent-orchestrator/src/webui/src/components/StreamConsole.tsx** — 增加决策控件
- **24h-agent-orchestrator/src/webui/src/components/HealthDashboard.tsx** — 改造为引擎监控
- **24h-agent-orchestrator/src/webui/src/components/SettingsPage.tsx** — 增加"更新插件"按钮
- **24h-agent-orchestrator/src/webui/src/types.ts** — 增加引擎相关类型
- 不涉及新外部依赖，不涉及数据库 schema 变更
```

## openspec/changes/comet-workflow-ui/design.md

- Source: openspec/changes/comet-workflow-ui/design.md
- Lines: 1-260
- SHA256: 98a54e72902f67077cabe15b8096cebf9db8fd7ce3b7d1f00f0e28c55070052c

[TRUNCATED]

```md
## Context

### 现状问题

Comet 双星开发流程的流程控制目前完全依赖 AI agent 阅读 SKILL.md 自然语言描述后自行理解执行。这种模式存在根因缺陷：

1. **软约束无强制力** — skill 中写"× 必须使用 AskUserQuestion"，模型仍然可以用文字输出代替
2. **状态漂移不可控** — agent 在长上下文中丢失阶段信息，跳步/漏步无法检测
3. **流程不可编程** — 无法在运行前验证流程合法性，无法手动干预
4. **不可观测** — 流程执行状态埋没在对话历史中，无结构化输出

### 解决思路

将 Comet 流程控制拆分为三层：

```
┌─────────────────────────────────────────┐
│           编排定义层 (JSON)               │
│  comet-orchestration.json               │
│  阶段 / 转换 / 守卫 / 决策点 / 条件        │
└────────────────┬────────────────────────┘
                 │ 加载
┌────────────────▼────────────────────────┐
│           编排执行层 (TypeScript)          │
│  Orchestrator  — 解释编排文件驱动流程      │
│  StateMachine — .comet.yaml 状态验证      │
│  GuardScheduler — 调用 shell 守卫脚本     │
└────────────────┬────────────────────────┘
                 │ API / WS
┌────────────────▼────────────────────────┐
│           UI 展示层 (React)              │
│  左侧阶段面板 / 中间决策控制台 / 右侧监控   │
└─────────────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- 新增 `src/comet-engine/` 编排引擎模块，代码强制约束流程
- `comet-orchestration.json` 定义完整流程，引擎解释执行
- 每次阶段转换通过"代码校验 + 状态机校验"双重验证
- 三面板 UI 由引擎状态驱动，而非模型文字输出驱动
- 支持手动编排（编辑 JSON 调整流程）和未来自动化编排

**Non-Goals:**
- 不替换现有 comet shell 脚本（guard/state/handoff/archive），引擎调用它们
- 不修改 OpenSpec 文件存储结构
- 不引入第三方工作流引擎（自研轻量级）
- 不实现可视化流程编辑器（仅 JSON 编辑）

## Decisions

### 架构

```
src/comet-engine/
├── types.ts              # 编排引擎类型定义
├── orchestrator.ts        # 编排器核心
├── state-machine.ts       # 状态机
├── guard-scheduler.ts     # 守卫调度器
└── __tests__/             # 引擎单元测试
```

### 1. JSON 编排文件格式 (`comet-orchestration.json`)

```json
{
  "schema": "comet-orchestration-v1",
  "initialPhase": "open",
  "phases": {
    "open": {
      "label": "开启",
      "description": "探索想法，创建 Change 结构",
      "entry": {
        "guards": ["comet-state.sh check <change> open"],
        "preconditions": [
          "openspec/changes/<change>/proposal.md exists",
          "openspec/changes/<change>/.comet.yaml phase=open"
        ],
        "autoCreate": ["proposal.md", "design.md", "tasks.md"]
```

Full source: openspec/changes/comet-workflow-ui/design.md

## openspec/changes/comet-workflow-ui/tasks.md

- Source: openspec/changes/comet-workflow-ui/tasks.md
- Lines: 1-58
- SHA256: b4c0f96c9896b8413bb547692a196e2e85f71c56c326d3559806c40e0b7c3189

```md
## 1. 流程编排 JSON 定义

- [ ] 1.1 设计并创建 `comet-orchestration.json`，定义五阶段（open/design/build/verify/archive）及其 entry/exit/guards/decisionPoints
- [ ] 1.2 在 JSON 中添加 hotfix/tweak preset 定义（skipPhases、skipGuards、upgradeRules）
- [ ] 1.3 添加 JSON schema 校验脚本

## 2. 编排引擎核心

- [ ] 2.1 实现 `src/comet-engine/types.ts` — 编排引擎类型定义（CometOrchestration, Phase, Guard, DecisionPoint 等）
- [ ] 2.2 实现 `src/comet-engine/state-machine.ts` — 状态机：.comet.yaml 读写、转换合法性验证、双写校验
- [ ] 2.3 实现 `src/comet-engine/guard-scheduler.ts` — 守卫调度器：child_process 执行 shell 脚本，超时处理，失败重试
- [ ] 2.4 实现 `src/comet-engine/orchestrator.ts` — 编排器核心：加载 JSON，驱动阶段转换，决策点管理，双重验证

## 3. 命令路由与 API 集成

- [ ] 3.1 扩展 `src/slash/index.ts` — 增加 Comet 命令路由，指向编排引擎
- [ ] 3.2 实现智能命令推断逻辑 — 无明确 / 前缀时推断 Comet 命令类型
- [ ] 3.3 在 `src/server/api.ts` 增加 `GET /api/comet/status` 端点
- [ ] 3.4 在 WebSocket 协议中增加 `comet-state-update` 和 `comet-decision` 消息类型
- [ ] 3.5 服务器端编排状态变更 -> WebSocket 推送集成

## 4. 左侧面板：编排阶段视图

- [ ] 4.1 改造 TreeView.tsx — 增加编排阶段列表模式，由引擎状态驱动
- [ ] 4.2 实现阶段状态指示（active/completed/pending）和进度展示
- [ ] 4.3 实现决策点待处理指示、非法转换按钮禁用
- [ ] 4.4 实现阶段展开/折叠和步骤展示

## 5. 中间控制台：决策交互增强

- [ ] 5.1 在 StreamConsole.tsx 中增加编排执行日志展示
- [ ] 5.2 实现 AskUserQuestion 决策卡片组件（单选/多选按钮）
- [ ] 5.3 实现决策选项通过 WebSocket 发送到引擎
- [ ] 5.4 实现守卫失败红色高亮展示

## 6. 右侧面板：引擎监控

- [ ] 6.1 改造 HealthDashboard.tsx — 预算压缩为单行进度条
- [ ] 6.2 增加引擎状态概览组件（change、phase、workflow type、verify result）
- [ ] 6.3 增加活跃 change 列表组件
- [ ] 6.4 增加归档状态展示

## 7. 状态同步与集成

- [ ] 7.1 实现前端 CometEngineState 管理和面板数据联动
- [ ] 7.2 App.tsx 中三面板数据流整合（引擎状态 → WebSocket → UI）
- [ ] 7.3 双写校验集成到编排器转换流程

## 8. 插件更新功能

- [ ] 8.1 后端实现 `POST /api/plugins/update` 端点，执行 openspec/superpowers 更新
- [ ] 8.2 前端 Settings 页面增加"更新插件"按钮及进度/结果展示

## 9. 验证

- [ ] 9.1 编译验证：TypeScript 类型检查和构建通过
- [ ] 9.2 单元测试：编排引擎核心逻辑（状态机、守卫调度、转换验证）
- [ ] 9.3 UI 验证：三面板布局和交互功能测试
```

## openspec/changes/comet-workflow-ui/specs/comet-command-routing/spec.md

- Source: openspec/changes/comet-workflow-ui/specs/comet-command-routing/spec.md
- Lines: 1-51
- SHA256: efc7f1581b2ae380319c68f530b2dd3e6529af03a2997f963a996d898c188bc0

```md
## ADDED Requirements

### Requirement: Comet 命令解析与路由
系统 SHALL 解析用户输入中的 `/comet-xxx` 前缀命令，并将其分发到对应的 Comet 工作流阶段。

支持的 Comet 命令：`/comet-open`, `/comet-design`, `/comet-build`, `/comet-verify`, `/comet-archive`, `/comet-hotfix`, `/comet-tweak`, `/comet`（自动检测）。

#### Scenario: 明确输入 /comet 命令
- **WHEN** 用户输入以 `/comet-` 开头
- **THEN** 系统将命令及其参数传递给 Comet 工作流引擎执行

#### Scenario: 输入 /comet 无子命令
- **WHEN** 用户输入 `/comet`（无子命令）
- **THEN** 系统执行阶段自动检测流程（Step 0 → Step 1 → Step 2）

#### Scenario: 非 / 前缀输入
- **WHEN** 用户输入不以 `/` 开头
- **THEN** 系统执行智能命令推断

### Requirement: 智能命令推断
当用户输入不以 `/` 开头时，系统 SHALL 根据上下文判断可能的 Comet 命令类型，让用户确认后执行。

#### Scenario: 描述匹配 comet 命令
- **WHEN** 用户输入描述性文本（如"我要修复一个 bug"）
- **THEN** 系统推断可能匹配 `/comet-hotfix`，询问用户确认

#### Scenario: 用户拒绝推断
- **WHEN** 用户拒绝系统推断的 Comet 命令
- **THEN** 系统回退到普通任务创建流程

#### Scenario: 用户确认推断
- **WHEN** 用户确认系统推断的 Comet 命令
- **THEN** 系统按确认的 Comet 命令执行对应工作流

### Requirement: 命令参数透传
系统 SHALL 将 Comet 命令后的参数原样传递到对应的 Comet 工作流。

#### Scenario: 带参数的命令
- **WHEN** 用户输入 `/comet-open 参考comet工程代码的核心流程，实现如下要求`
- **THEN** 系统将 `参考comet工程代码的核心流程，实现如下要求` 作为参数传递给 open 阶段

### Requirement: 任务拆解与分发
系统 SHALL 根据 Comet 命令将工作拆解为子任务，并分发到子 agent 执行。

#### Scenario: 按阶段拆解
- **WHEN** 系统确认 Comet 命令类型
- **THEN** 系统按对应阶段的产物要求拆解任务（如 open 阶段需创建 proposal/design/tasks）

#### Scenario: 子任务跟踪
- **WHEN** 任务被拆解为子任务
- **THEN** 每个子任务的状态（pending/running/completed/failed）被跟踪并在 UI 中展示
```

## openspec/changes/comet-workflow-ui/specs/comet-engine-ui-panels/spec.md

- Source: openspec/changes/comet-workflow-ui/specs/comet-engine-ui-panels/spec.md
- Lines: 1-96
- SHA256: bafd5fa2bd58a382ac1e17860452aeb3c9a584dbfcb0b55addc6571ff67c8aac

[TRUNCATED]

```md
## ADDED Requirements

### Requirement: 左侧面板 — 编排阶段列表
系统左侧面板 SHALL 由编排引擎状态驱动，展示 Comet 各阶段的进展和状态。

#### Scenario: 阶段列表展示
- **WHEN** 用户打开主页
- **THEN** 左侧面板展示编排引擎定义的 phases 列表，每个阶段显示名称、状态图标（active/completed/pending）、进度

#### Scenario: 阶段状态驱动
- **WHEN** 编排引擎状态变更
- **THEN** 左侧面板跟随更新，当前阶段标记为 active，已完成阶段标记为 completed

#### Scenario: 决策点指示
- **WHEN** 当前阶段有未处理的决策点（decisionPoints）
- **THEN** 阶段标签上显示等待图标，提示用户需要决策

#### Scenario: 子项展示
- **WHEN** 阶段包含多个步骤
- **THEN** 可展开查看步骤列表及其完成状态

#### Scenario: 非法转换禁用
- **WHEN** 用户点击的阶段不在编排定义的允许转换列表中
- **THEN** 该阶段按钮禁用，悬停显示不可达原因

### Requirement: 中间控制台 — 决策交互与执行日志
中间控制台 SHALL 展示编排引擎的执行日志和决策点交互控件。

#### Scenario: 编排执行日志
- **WHEN** 编排引擎执行阶段转换
- **THEN** 控制台实时显示执行步骤（检查前置条件 → 运行 guard → 更新状态 → 检查后置条件）

#### Scenario: AskUserQuestion 决策卡片
- **WHEN** 编排引擎到达决策点
- **THEN** 控制台渲染决策卡片，显示编排 JSON 中定义的 prompt 和 options，用户选择后引擎调用 evaluateDecision()

#### Scenario: 决策回传
- **WHEN** 用户点击决策卡片的选项
- **THEN** 通过 WebSocket 发送 `comet-decision` 消息，引擎处理后续流程

#### Scenario: 守卫失败展示
- **WHEN** guard 脚本执行失败
- **THEN** 控制台红色高亮显示失败原因和脚本输出

### Requirement: 右侧面板 — 编排引擎监控
右侧面板 SHALL 展示编排引擎的整体运行状态，预算显示压缩为单行进度条。

#### Scenario: 预算单行显示
- **WHEN** 右侧面板渲染
- **THEN** 预算以单行进度条形式展示（如 `预算: ¥1.50 / ¥10.00 ████░░░░ 15%`）

#### Scenario: 引擎状态概览
- **WHEN** 编排引擎运行中
- **THEN** 面板展示：当前 change 名称、工作流类型（full/hotfix/tweak）、当前阶段名称、阶段 ID

#### Scenario: 活跃 change 列表
- **WHEN** 有多个活跃 change
- **THEN** 面板列出所有活跃 change，每个显示名称、当前阶段、状态摘要

#### Scenario: 验证报告入口
- **WHEN** `.comet.yaml` 中 verify_result 不为 pending
- **THEN** 面板显示验证结果（pass/fail）和验证报告路径

#### Scenario: 归档状态
- **WHEN** `.comet.yaml` 中 archived: true
- **THEN** 面板显示归档标记和归档时间

### Requirement: Settings — 更新插件按钮
Settings 页面 SHALL 包含"更新插件"按钮，用于从上游仓库更新 openspec、superpowers 及相关 skill。

#### Scenario: 点击更新插件
- **WHEN** 用户在 Settings 页面点击"更新插件"按钮
- **THEN** 调用 `POST /api/plugins/update` 端点，前端显示更新进度和结果

#### Scenario: 更新成功
- **WHEN** 插件更新完成且成功
- **THEN** 前端显示"更新成功"提示

#### Scenario: 更新失败
- **WHEN** 插件更新失败
```

Full source: openspec/changes/comet-workflow-ui/specs/comet-engine-ui-panels/spec.md

## openspec/changes/comet-workflow-ui/specs/comet-orchestration-engine/spec.md

- Source: openspec/changes/comet-workflow-ui/specs/comet-orchestration-engine/spec.md
- Lines: 1-84
- SHA256: b256dbb1816d4f1482b9980a7b068c8112a8ac957d100f9f78008bb048140bde

[TRUNCATED]

```md
## ADDED Requirements

### Requirement: 编排引擎核心
系统 SHALL 提供一个编排引擎（CometOrchestrator），从 `comet-orchestration.json` 加载流程定义并驱动 Comet 工作流执行。

#### Scenario: 引擎启动
- **WHEN** 引擎启动
- **THEN** 加载 `comet-orchestration.json` 流程定义，读取当前 change 的 `.comet.yaml`，校验一致后进入当前阶段

#### Scenario: 阶段转换
- **WHEN** 引擎执行阶段转换
- **THEN** 按编排定义顺序执行：前置条件检查 → guard 脚本执行 → 状态机状态更新 → 后置条件检查

#### Scenario: 非法转换拒绝
- **WHEN** 请求执行编排定义中不存在的阶段转换（如 open → verify）
- **THEN** 引擎拒绝转换，返回错误信息

#### Scenario: 预设路径
- **WHEN** 使用 hotfix/tweak preset
- **THEN** 引擎跳过编排定义中 `presets.<name>.skipPhases` 指定的阶段，跳过 `skipGuards` 指定的守卫

### Requirement: JSON 流程编排定义
系统 SHALL 通过 `comet-orchestration.json` 定义完整流程，支持阶段、转换、守卫、决策点、预设路径。

#### Scenario: 编排文件加载
- **WHEN** 引擎加载编排文件
- **THEN** 校验 JSON schema 合法，阶段转换关系无环，preset 引用的阶段/守卫存在

#### Scenario: 阶段定义
- **WHEN** 编排文件定义阶段
- **THEN** 每个阶段包含 label、description、entry（guards + preconditions）、exit（guards + postconditions + transitionTo）、decisionPoints

#### Scenario: 决策点定义
- **WHEN** 编排文件定义决策点
- **THEN** 每个决策点包含 id、prompt、options 列表（label + action + guard），action 支持 transition、modify-artifacts、promote-to-full 等

#### Scenario: 升级规则
- **WHEN** 编排文件定义 upgradeRules
- **THEN** 引擎在执行 preset 路径时自动检查条件，满足时暂停并请求升级

### Requirement: 状态机
系统 SHALL 通过状态机组件（CometStateMachine）管理 `.comet.yaml` 的读写和状态转换验证。

#### Scenario: 状态读取
- **WHEN** 需要获取当前状态
- **THEN** 从 `openspec/changes/<change>/.comet.yaml` 读取阶段信息

#### Scenario: 转换验证
- **WHEN** 请求状态转换
- **THEN** 校验目标阶段在编排定义的允许转换列表中，通过后更新 `.comet.yaml`

#### Scenario: 双写校验
- **WHEN** 状态机写入 `.comet.yaml`
- **THEN** 写入后立即读取验证，确保写入内容与预期一致

### Requirement: 守卫调度器
系统 SHALL 通过守卫调度器（CometGuardScheduler）执行编排定义中引用的 shell 脚本守卫。

#### Scenario: 守卫执行
- **WHEN** 需要执行 guard 脚本
- **THEN** 通过 child_process.execFile 执行，设置 30 秒超时，捕获 stdout/stderr

#### Scenario: 守卫失败
- **WHEN** guard 脚本返回非零退出码
- **THEN** 引擎停止转换流程，返回失败信息和脚本输出

#### Scenario: 守卫定位
- **WHEN** guard 脚本路径为变量名（如 `$COMET_GUARD`）
- **THEN** 调度器解析环境变量，找不到时按 `.opencode/skills/comet/scripts/` 模式搜索

### Requirement: 双重验证机制
每次阶段转换 SHALL 通过编排器校验和状态机校验两条路径。

#### Scenario: 编排器前置校验
- **WHEN** 阶段转换前
- **THEN** 编排器检查编排 JSON 中的 preconditions（文件存在、yaml 字段值匹配）

#### Scenario: 状态机后置校验
- **WHEN** 状态机写入后
- **THEN** 状态机校验 schema 合法、转换路径合法、写入可回读
```

Full source: openspec/changes/comet-workflow-ui/specs/comet-orchestration-engine/spec.md

## openspec/changes/comet-workflow-ui/specs/comet-ui-panels/spec.md

- Source: openspec/changes/comet-workflow-ui/specs/comet-ui-panels/spec.md
- Lines: 1-77
- SHA256: c6aec62fce6b33ce7c31f3497c6a49b6f06dcf1ca2505779ea3dffcd41ee1aba

```md
## ADDED Requirements

### Requirement: 左侧面板 — Comet 阶段任务列表
系统左侧面板 SHALL 展示 Comet 各阶段（open → design → build → verify → archive）的进展和状态。

#### Scenario: 阶段列表展示
- **WHEN** 用户打开主页
- **THEN** 左侧面板展示 Comet 五阶段的垂直列表，每个阶段显示名称、状态图标和进度

#### Scenario: 阶段状态指示
- **WHEN** 当前 change 处于某个阶段
- **THEN** 该阶段标记为 active，已完成阶段标记为 completed，未开始阶段标记为 pending

#### Scenario: 任务子项展示
- **WHEN** 阶段包含子任务
- **THEN** 可展开显示该阶段下的子任务列表及其状态

#### Scenario: 阶段切换
- **WHEN** 用户点击某个阶段
- **THEN** 中间控制台切换显示该阶段的详情和执行日志

### Requirement: 中间控制台 — 决策与执行展示
中间控制台 SHALL 展示任务/子任务的执行情况，以及 AskUserQuestion 决策交互。

#### Scenario: 任务执行展示
- **WHEN** 子任务正在执行
- **THEN** 控制台实时显示执行日志（thinking、tool_call、text 等 chunk 类型）

#### Scenario: AskUserQuestion 决策卡片
- **WHEN** 系统需要用户决策
- **THEN** 控制台渲染决策卡片，包含问题描述和选项按钮（单选/多选）

#### Scenario: 用户确认选择
- **WHEN** 用户点击决策卡片的选项
- **THEN** 系统处理用户选择，继续后续流程

#### Scenario: 多轮决策
- **WHEN** 流程中有多个决策点
- **THEN** 每个决策点独立展示卡片，历史决策可滚动查看

### Requirement: 右侧面板 — Comet 状态监控
右侧面板 SHALL 展示 Comet 工作流的整体状态，预算显示压缩为单行，其余展示 Comet 状态信息。

#### Scenario: 预算单行显示
- **WHEN** 右侧面板渲染
- **THEN** 预算以单行进度条形式展示（如 `预算: ¥1.50 / ¥10.00 ████░░░░ 15%`）

#### Scenario: Comet 状态概览
- **WHEN** 有活跃 change
- **THEN** 面板展示当前 change 名称、工作流类型（full/hotfix/tweak）、当前阶段、验证结果

#### Scenario: 活跃 change 列表
- **WHEN** 有多个活跃 change
- **THEN** 面板列出所有活跃 change 及其状态摘要

#### Scenario: 验证报告入口
- **WHEN** change 已完成验证
- **THEN** 面板显示验证结果（pass/fail）和验证报告链接

#### Scenario: 归档状态展示
- **WHEN** change 已归档
- **THEN** 面板显示归档标记和归档时间

### Requirement: Comet 状态数据同步
系统 SHALL 通过 WebSocket 和 REST API 同步 Comet 状态数据到前端。

#### Scenario: WebSocket 实时推送
- **WHEN** Comet 状态变更
- **THEN** 服务器通过 WebSocket 推送 `comet-state-update` 消息

#### Scenario: REST API 状态查询
- **WHEN** 前端页面加载
- **THEN** 通过 `GET /api/comet/status` 获取完整 Comet 状态

#### Scenario: 文件系统状态读取
- **WHEN** 查询 Comet 状态
- **THEN** 系统从 `.comet.yaml` 和 `openspec/changes/` 读取状态数据
```

