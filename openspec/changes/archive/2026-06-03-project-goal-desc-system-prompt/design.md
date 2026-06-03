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
