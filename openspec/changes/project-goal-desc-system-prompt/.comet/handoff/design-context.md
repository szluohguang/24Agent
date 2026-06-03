# Comet Design Handoff

- Change: project-goal-desc-system-prompt
- Phase: design
- Mode: compact
- Context hash: d9aefc8c0f416bea799f466669b87cf9f483ed0f2d04cc0e78a5241abef2c339

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/project-goal-desc-system-prompt/proposal.md

- Source: openspec/changes/project-goal-desc-system-prompt/proposal.md
- Lines: 1-26
- SHA256: 00594b681413dbff0978c6052bd7aced1fc6ad871e34b4fae054be14efc81a85

```md
## Why

项目目标和描述是任务的上下文核心，但目前编辑界面无任何输入引导，用户不知道如何写出高质量的目标和描述。同时，子 Agent 分发时也不携带项目目标/描述信息，导致 AI 执行任务缺乏项目级上下文感知。

## What Changes

- ProjectSettings 页面的 goal/description textarea 增加 placeholder 提示文本，指导用户编写
- 子 Agent 分发时（sendTaskPrompt），将项目目标/描述注入 system prompt 中
- `/project goal` 和 `/project desc` 的 set 命令输出中增加编写建议
- i18n 中英文新增 placeholder 和 hint 文案

## Capabilities

### New Capabilities
- `project-prompt-hints`: 项目目标/描述的 UI 输入提示和 system prompt 注入能力

### Modified Capabilities
- `project-settings`: goal/description 字段增加 placeholder 提示
- `project-detail`: 无变化

## Impact

- `src/webui/src/components/ProjectSettings.tsx` — goal/description textarea 加 placeholder
- `src/orchestrator/core.ts` — sendTaskPrompt 增加项目上下文注入
- `src/webui/src/i18n/en-US.json` — 新增文案
- `src/webui/src/i18n/zh-CN.json` — 新增文案
```

## openspec/changes/project-goal-desc-system-prompt/design.md

- Source: openspec/changes/project-goal-desc-system-prompt/design.md
- Lines: 1-35
- SHA256: f9282ac1a371184423a205b398c4414cc870666b2f2707b2c7080b3f4224337d

```md
## Context

当前 ProjectSettings 页面的 goal 和 description 字段没有任何输入引导（placeholder/hint），用户面对空白文本框不知如何填写。同时，子 Agent 分发时调用的 `sendTaskPrompt` 方法只包含任务本身的 prompt，不携带项目的目标和描述上下文，导致子 Agent 缺乏项目级背景信息。

## Goals / Non-Goals

**Goals:**
- goal/description 输入框增加 placeholder 提示文本，指导用户编写高质量内容
- 子 Agent 分发时，将项目目标/描述注入 system prompt
- `/project goal set` 和 `/project desc set` 返回提示信息
- 中英文 i18n 文案新增

**Non-Goals:**
- 不改动 optimize API（`/api/project/optimize`）
- 不新增数据库字段
- 不改动 ProjectDetail 展示页

## Decisions

1. **Placeholder 文案设计** — 直接使用 textarea 的 placeholder 属性。文案提供具体示例，引导用户从"做什么、为什么、怎么做"三个维度编写。文案存储在 i18n 中。

2. **System Prompt 注入** — 在 `core.ts` 的 `sendTaskPrompt` 方法中，将项目目标/描述拼接到 system prompt 末尾。格式：
   ```
   ## Project Context
   Goal: <project goal>
   Description: <project description>
   ```
   仅当 goal 或 description 非空时注入。

3. **Slash 命令提示** — `/project goal set` 和 `/project desc set` 成功后，附加一段编写建议，引导用户写出更好的内容。

## Risks / Trade-offs

- [低] Placeholder 文本不会保存，仅提供引导。用户仍可输入任意内容。
- [低] System prompt 注入会增加 token 消耗，但 goal/description 通常很短（<500 tokens），影响可忽略。
```

## openspec/changes/project-goal-desc-system-prompt/tasks.md

- Source: openspec/changes/project-goal-desc-system-prompt/tasks.md
- Lines: 1-25
- SHA256: 80582acf8e107cfa3632a3d1aa2b863e7a5fc874399add5eefc2de396820be72

```md
## 1. i18n 文案 — goal/description placeholder

- [ ] 1.1 en-US.json 添加 goal/description placeholder 文案
- [ ] 1.2 zh-CN.json 添加 goal/description placeholder 文案

## 2. ProjectSettings — placeholder 提示

- [ ] 2.1 goal textarea 添加 placeholder 属性，引用 i18n 文案
- [ ] 2.2 description textarea 添加 placeholder 属性，引用 i18n 文案

## 3. System Prompt 注入

- [ ] 3.1 `core.ts` 的 `sendTaskPrompt` 中读取项目目标/描述，拼接到 system prompt
- [ ] 3.2 仅在 goal 或 description 非空时注入 `## Project Context` 段

## 4. Slash 命令编写提示

- [ ] 4.1 `/project goal set` 成功后输出编写建议
- [ ] 4.2 `/project desc set` 成功后输出编写建议

## 5. 验证

- [ ] 5.1 TypeScript typecheck 通过
- [ ] 5.2 单元测试通过
- [ ] 5.3 构建通过
```

## openspec/changes/project-goal-desc-system-prompt/specs/project-prompt-hints/spec.md

- Source: openspec/changes/project-goal-desc-system-prompt/specs/project-prompt-hints/spec.md
- Lines: 1-35
- SHA256: 866adb8bac903ad38652ea94acb75c9ae653bc9dd5e69d809b19266e6b7a748e

```md
## ADDED Requirements

### Requirement: Goal field placeholder text
ProjectSettings 的 goal textarea SHALL display a placeholder with writing guidance.

#### Scenario: Placeholder visible on empty goal
- **WHEN** goal field is empty and user views ProjectSettings
- **THEN** textarea SHALL display placeholder text with goal writing advice

### Requirement: Description field placeholder text
ProjectSettings 的 description textarea SHALL display a placeholder with writing guidance.

#### Scenario: Placeholder visible on empty description
- **WHEN** description field is empty and user views ProjectSettings
- **THEN** textarea SHALL display placeholder text with description writing advice

### Requirement: System prompt injection
When dispatching a task to a sub-agent, the system prompt SHALL include project goal and description if they are non-empty.

#### Scenario: Goal and description injected into system prompt
- **WHEN** a task is dispatched via sendTaskPrompt
- **AND** project goal or description is non-empty
- **THEN** the system prompt SHALL include a "## Project Context" section with goal and description

#### Scenario: No injection when both empty
- **WHEN** a task is dispatched
- **AND** both project goal and description are empty
- **THEN** the system prompt SHALL NOT include the "## Project Context" section

### Requirement: Slash command set hint
`/project goal set` and `/project desc set` commands SHALL output writing advice after successful set.

#### Scenario: Writing advice shown after goal set
- **WHEN** user runs `/project goal set <text>`
- **THEN** after confirming the goal is set, system SHALL display writing advice for goals
```

