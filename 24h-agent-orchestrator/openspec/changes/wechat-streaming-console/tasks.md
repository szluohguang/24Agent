## 1. WeChatManager — 流式推送能力

- [ ] 1.1 在 WeChatManager 中新增 WeChatStreamSession 内部类（缓冲区、节流定时器、发送队列）
- [ ] 1.2 实现 streamToUser() 方法：接收 chunk，按 sessionId 路由到对应 StreamSession
- [ ] 1.3 实现 flushToWeChat()：合并缓冲区内容，串行化发送到 WeChat
- [ ] 1.4 流式推送期间周期性调用 sendTyping 保持"正在输入"状态
- [ ] 1.5 任务结束时 flush 剩余缓冲区并发送最终结果

## 2. Orchestrator — 事件路由到 WeChat

- [ ] 2.1 onChunk 回调中判断 consoleToWechat 状态，路由 chunk 到 WeChatManager.streamToUser()
- [ ] 2.2 onTextDelta 回调中判断 stream_level=full 时路由 text delta
- [ ] 2.3 加载/持久化 wechat_stream_level 配置项

## 3. SlashHandler — /stream 命令

- [ ] 3.1 在 SlashHandler 中注册 /stream 子命令处理器
- [ ] 3.2 实现参数解析（off / thinking / full）和配置更新
- [ ] 3.3 返回值：确认/帮助消息

## 4. 前端 — WeChat 设置页扩展

- [ ] 4.1 WeChatSettings.tsx 添加流式级别选择器（RadioGroup: off / thinking / full）
- [ ] 4.2 API 扩展：WeChat 配置 GET/PUT 增加 stream_level 字段
- [ ] 4.3 中英文 i18n 字符串更新
