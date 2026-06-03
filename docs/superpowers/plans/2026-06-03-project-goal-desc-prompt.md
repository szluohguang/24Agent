---
change: project-goal-desc-system-prompt
design-doc: docs/superpowers/specs/2026-06-03-project-goal-desc-prompt-design.md
base-ref: 272dc9e5c9e1ba15590e5c5a6b587a7bede2d7f9
---

# Project Goal/Description System Prompt — Plan

## 任务总览

共 5 组 11 个任务，均为前端/i18n/后端文案类修改，无跨模块依赖。

## 执行顺序

1. i18n 文案（en-US + zh-CN）
2. ProjectSettings placeholder
3. System prompt 注入（core.ts）
4. Slash 命令提示（slash/index.ts）
5. 验证

## 变更估算

| 估算 | 值 |
|------|-----|
| 涉及文件 | 5 |
| 新增代码 | ~30 行 |
| 修改代码 | ~15 行 |
| 新增文案 | ~8 条 |
