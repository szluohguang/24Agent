## 1. Logger 模块

- [x] 1.1 创建 `src/orchestrator/logger.ts` — Logger 类，含 LogLevel enum、CORE_TAGS、文件输出、debug/production 双模式

## 2. 更新入口 + 替换 console 调用

- [x] 2.1 更新 `src/index.ts` — 初始化 Logger，替换 console.log/error 调用
- [x] 2.2 更新 `src/orchestrator/acp-manager.ts` — 添加注释，替换 console.log
- [x] 2.3 更新 `src/orchestrator/store.ts` — 添加注释，替换 console.warn

## 3. 为核心源文件添加中文注释

- [x] 3.1 `src/orchestrator/core.ts` — 添加核心架构中文注释
- [x] 3.2 `src/orchestrator/health-monitor.ts` — 添加中文注释
- [x] 3.3 `src/orchestrator/recovery.ts` — 添加中文注释
- [x] 3.4 `src/orchestrator/scheduler.ts` — 添加中文注释
- [x] 3.5 `src/orchestrator/database.ts` — 添加中文注释
- [x] 3.6 `src/observer/event-stream.ts` — 添加中文注释，替换 console.error
- [x] 3.7 `src/observer/evaluator.ts` — 添加中文注释
- [x] 3.8 `src/server/http.ts` — 添加中文注释
- [x] 3.9 `src/server/websocket.ts` — 添加中文注释
- [x] 3.10 `src/server/api.ts` — 添加中文注释

## 4. 验证

- [x] 4.1 运行 `npm run typecheck` 确保无类型错误
