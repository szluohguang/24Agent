## Why

当前系统通过 WeChat 发送任务结果仅在任务完成时触发，用户无法实时了解任务执行进度和思考过程。这导致：
- 用户在微信中发起任务后需要等待较长时间（数分钟）无反馈
- 无法观察 Agent 的思考过程和工具调用，降低了对系统行为的透明度和信任感
- 无法从微信端动态控制推送粒度

通过在任务执行过程中流式推送思考过程、工具调用和中间结果到微信，用户可以实时掌握任务进展，提升交互体验。

## What Changes

- 新增 `wechat_stream_level` 配置项（`off` / `thinking` / `full`），控制推送粒度
- 任务执行过程中按事件驱动（thinking 块、tool_call、tool_result、text delta）增量推送到微信
- 每 session 独立缓冲，支持节流合并避免消息轰炸
- 新增微信斜杠命令 `/stream <off|thinking|full>`，允许用户从微信端动态调节推送级别
- `consoleToWechat` 开关作为主开关，`stream_level` 在其之上控制精细化程度
- 保留现有任务完成时发送最终结果的逻辑

## Capabilities

### New Capabilities
- `wechat-streaming`: WeChat 流式推送能力，包括事件采集、增量发送、节流控制
- `wechat-slash-stream`: 微信斜杠命令 `/stream`，支持动态调节推送级别

### Modified Capabilities
- `wechat-integration`: 现有的 WeChat 集成配置项扩展，新增 `wechat_stream_level`

## Impact

- `src/wechat/manager.ts` — 新增流式推送方法和缓冲区管理
- `src/orchestrator/core.ts` — onChunk 事件路由到 WeChat
- `src/slash/index.ts` — 新增 `/stream` 子命令处理
- `src/server/api.ts` — WeChat 配置 API 扩展字段
- `src/orchestrator/store.ts` — 持久化新的配置字段
- `src/webui/.../WeChatSettings.tsx` — 流式级别 UI 选择器
- `src/webui/.../i18n/*.json` — 新增中文字符串
