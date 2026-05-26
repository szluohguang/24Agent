# UI 三栏布局 Bug + 流式控制台 + 任务点选继续提问 — 执行报告

## 变更概览

| 项目 | 内容 |
|---|---|
| 名称 | ui-three-bugs-fix |
| 日期 | 2026-05-25 |
| 触发 | 用户反馈 3 个 UI Bug |
| 耗时 | ~20 分钟 |

## Bug 清单与修复方案

| # | Bug | 根因 | 修复 |
|---|-----|------|------|
| 1 | 右监控面板未右对齐 | 外层容器缺 `width:100%` | 添加 `width: '100%'` 到根容器 |
| 2 | 流式控制台无输出 | `stream-delta` 丢弃未知 session；`applyState` 整体替换 sessions | session 不存在时自动创建；`applyState` 合并而非替换 |
| 3 | 任务列表不可选/无继续提问 | TreeView 无点选交互；无后续 prompt 机制 | 点选高亮联动 activeSessionId；新增继续提问输入框 + WS 消息 + 后端方法 |

## 变更文件清单

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/webui/src/App.tsx` | 布局修复 + stream-delta 容错 + applyState 合并 + 任务点选 + 继续提问 UI |
| `src/webui/src/components/TreeView.tsx` | 新增 selectedTaskId/onSelect props，点选高亮 |
| `src/webui/src/components/__tests__/TreeView.test.tsx` | 新增点选/选中样式测试 |
| `src/webui/src/i18n/zh-CN.json` | 添加继续提问翻译 |
| `src/webui/src/i18n/en-US.json` | 添加继续提问翻译 |
| `src/webui/src/hooks/useWebSocket.ts` | 补充 follow-up-prompt 消息类型 |
| `src/server/websocket.ts` | 新增 continue-prompt 消息处理 |
| `src/orchestrator/core.ts` | 新增 continuePrompt() 方法 |

## 验证结果

| 检查项 | 结果 |
|--------|------|
| TypeScript 类型检查 | ✓ |
| 单元测试 (20 文件) | 180/180 ✓ |
| Playwright E2E (27 用例) | 27/27 ✓ |
