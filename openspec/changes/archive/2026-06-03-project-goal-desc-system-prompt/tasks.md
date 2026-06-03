## 1. i18n 文案 — goal/description placeholder

- [x] 1.1 en-US.json 添加 goal/description placeholder 文案
- [x] 1.2 zh-CN.json 添加 goal/description placeholder 文案

## 2. ProjectSettings — placeholder 提示

- [x] 2.1 goal textarea 添加 placeholder 属性，引用 i18n 文案
- [x] 2.2 description textarea 添加 placeholder 属性，引用 i18n 文案

## 3. System Prompt 注入

- [x] 3.1 `core.ts` 的 `sendTaskPrompt` 中读取项目目标/描述，拼接到 system prompt
- [x] 3.2 仅在 goal 或 description 非空时注入 `## Project Context` 段

## 4. Slash 命令编写提示

- [x] 4.1 `/project goal set` 成功后输出编写建议
- [x] 4.2 `/project desc set` 成功后输出编写建议

## 5. 验证

- [x] 5.1 TypeScript typecheck 通过
- [x] 5.2 单元测试通过
- [x] 5.3 构建通过
