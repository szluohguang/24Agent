---
comet_change: project-goal-desc-system-prompt
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-03-project-goal-desc-system-prompt
status: final
---

# Project Goal/Description System Prompt — Design Doc

## 技术方案

### 1. UI Placeholder 提示

ProjectSettings 的 goal/description textarea 增加 `placeholder` 属性，文案来自 i18n。

- **Goal**: "例如：构建一个 24/7 自动运行的 Agent 编排系统，支持任务分解、子 Agent 分发、实时监控和自动评估。描述项目的核心目标和预期成果。"
- **Description**: "例如：本项目基于 opencode ACP 协议，实现从目标定义 → 任务分解 → 子 Agent 分发 → 实时观测 → 结果评估的自动化闭环。说明项目的背景、范围和技术方案。"

### 2. System Prompt 注入

在 `core.ts` 的 `sendTaskPrompt` 中，注入项目上下文：

```
## Project Context
- **Goal**: {project_goal}
- **Description**: {project_description}
```

仅当 goal 或 description 非空时注入。

### 3. Slash 命令编写提示

`/project goal set` 成功后输出：`✅ 项目目标已设置。提示：好的目标应包含"做什么"和"为什么"，例如"构建一个自动化系统，减少人工干预"。`

`/project desc set` 成功后输出：`✅ 项目描述已设置。提示：好的描述应说明项目背景、范围和技术方案，让读者快速理解项目全貌。`

## 测试策略

- 单元测试：验证 system prompt 注入逻辑（空/非空场景）
- 组件测试：验证 placeholder 渲染
- typecheck + build 验证

## 变更文件

| 文件 | 变更 |
|------|------|
| `src/webui/src/components/ProjectSettings.tsx` | textarea 加 placeholder |
| `src/orchestrator/core.ts` | sendTaskPrompt 注入项目上下文 |
| `src/slash/index.ts` | set 命令成功提示 |
| `src/webui/src/i18n/en-US.json` | 新增文案 |
| `src/webui/src/i18n/zh-CN.json` | 新增文案 |
