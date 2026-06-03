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
