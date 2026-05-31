## Why

当前 Orchestrator 代码中注释不完整，且所有日志输出仅通过 `console.log/warn/error` 直接写入 stdout/stderr，缺乏 log-to-file、日志级别过滤、debug/production 模式区分等能力。生产运行时无法追溯历史日志，调试时又缺少结构化输出。

## What Changes

- 创建 `src/orchestrator/logger.ts` 结构化日志模块，支持日志级别（DEBUG/INFO/WARN/ERROR）、文件输出、debug/production 双模式
- 为所有核心源文件添加中文注释，覆盖关键逻辑块的意图说明
- 将全局的 `console.log/warn/error` 调用替换为 Logger 实例调用
- 生产模式下只输出核心事件（task lifecycle、error、config change 等），过滤 debug 级细节日志

## Capabilities

### New Capabilities
- `structured-logging`: 结构化日志能力，含文件输出、级别过滤、debug/production 双模式

### Modified Capabilities
-（无需修改已有 spec）

## Impact

- 新增文件：`src/orchestrator/logger.ts`
- 修改：`index.ts`, `acp-manager.ts`, `core.ts`, `store.ts`, `event-stream.ts` 等所有含 `console.*` 调用的源文件
- 新增依赖：无（仅使用 Node.js 内置 `fs`、`path`）
- 日志文件写入 `logs/orchestrator-<date>.log`，NODE_ENV=production 时自动进入生产模式
