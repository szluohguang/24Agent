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
