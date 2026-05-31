## Context

Orchestrator 目前没有任何日志基础设施。所有输出由零散的 `console.log/warn/error` 构成：
- 无日志文件写入，生产运行无法追溯历史
- 无日志级别区分，debug 信息和错误信息混在一起
- 无模式区分，开发调试和生产运行使用同一套输出策略

同时，代码中存在大量无注释的逻辑块，需要补充中文说明降低后续维护门槛。

## Goals / Non-Goals

**Goals:**
- 创建 `Logger` 类，封装日志级别、文件输出、模式切换
- DEBUG 模式：所有日志写入控制台 + 文件
- PRODUCTION 模式：仅核心事件（startup/shutdown/task lifecycle/error/config/review）写入文件 + 控制台
- 为所有核心源文件添加中文注释
- 替换项目内全部 `console.*` 调用为 Logger
- 无新增外部依赖，仅用 Node.js 内置 `fs`、`path`

**Non-Goals:**
- 不引入日志轮转或第三方日志库
- 不修改已有业务逻辑
- 不改动现有测试

## Decisions

| 决策 | 方案 | 备选 | 理由 |
|---|---|---|---|
| 日志级别过滤 | LogLevel enum + 数字比较 | 字符串匹配 | 性能更好，编译期类型安全 |
| 生产模式过滤 | 通过 CORE_TAGS Set 匹配 tag | 通过日志级别 + 模块路径 | tag 语义更明确，与代码模块解耦 |
| 全局单例 | static getInstance() | DI 注入 | 减少侵入性改造，替换 console 调用成本最低 |
| 日志文件命名 | orchestrator-YYYY-MM-DD.log | 单文件 | 按日期拆分便于按天检索 |
| 目录位置 | `logs/`（cwd 下） | 固定绝对路径 | 与项目解耦，Docker 部署可挂载 volume |
| 注释语言 | 中文 | 英文 | 项目约定（AGENTS.md 规则 1） |

## Risks / Trade-offs

- [风险] 全局单例在测试中可能产生状态污染 → 提供 `resetInstance()` 供测试重置
- [风险] 文件写入是异步 IO，极端性能场景可能有延迟 → 使用 `fs.WriteStream` 缓存写，生产级应换 winston/pino
- [风险] 替换 console 调用可能遗漏某些场景 → 建立核查清单覆盖所有源文件
