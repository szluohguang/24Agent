# Comet Design Handoff

- Change: system-status-bar
- Phase: design
- Mode: compact
- Context hash: ec02b34acef189a55ea4df0b6132c988f119d41b144a0be5313f3bd1ed8a780b

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/system-status-bar/proposal.md

- Source: openspec/changes/system-status-bar/proposal.md
- Lines: 1-31
- SHA256: d00f5743d3d6ea2ee6c9d12dcb9ffbe3427e2fda89b12f01c96b1a10b5fccc24

```md
## Why

目前系统异常信息（服务中断、模型连接失败、接口调用错误等）缺乏统一的展示入口。健康状态仅通过右侧面板的 `healthStale` 半透明+文字提示反映，错误信息没有持久化展示，用户无法快速发现和排查问题。需要底部状态栏集中展示系统异常信息。

## What Changes

- 在主界面底部新增全局状态栏，固定高度，始终可见
- 状态栏按 log 类型颜色区分：info(蓝色)、warning(黄色)、error(红色)
- error 级别的消息不允许被覆盖（必须用户点击查看后才解除），其他级别可被新消息覆盖
- 状态栏可点击，打开日志详情页，按时间倒序展示完整日志
- 日志详情页支持按类型（info/warning/error）快速筛选排查

## Capabilities

### New Capabilities
- `system-status-bar`: 底部状态栏组件，显示系统异常信息，颜色分级，错误持久化
- `system-log-viewer`: 日志详情页面，按时间倒序展示，支持类型筛选过滤

### Modified Capabilities
- _(无)_

## Impact

- **src/webui/src/App.tsx** — 在主布局底部增加 StatusBar 组件
- **src/webui/src/components/StatusBar.tsx** — 新增底部状态栏组件
- **src/webui/src/components/LogViewer.tsx** — 新增日志详情页组件
- **src/webui/src/types.ts** — 增加 SystemLogEntry 类型定义
- **src/server/websocket.ts** — 增加 `system-log` WebSocket 消息类型
- **src/server/api.ts** — 增加 `GET /api/logs` 端点（历史日志+实时日志缓存）
- **src/orchestrator/logger.ts** — 增加日志缓存和推送接口
- 不涉及新外部依赖，不涉及数据库 schema 变更
```

## openspec/changes/system-status-bar/design.md

- Source: openspec/changes/system-status-bar/design.md
- Lines: 1-83
- SHA256: c593fe9663041a8c2b5bb707fd9abc69b90ccc301944489777923216a4976007

[TRUNCATED]

```md
## Context

当前没有统一的系统异常通知机制。仅有的 `healthStale` 标志通过右侧面板 dim 效果和文字提示反映健康检查失败。错误信息分散在 WebSocket 消息、health poll 和 agent-state 中，无聚合展示。

## Goals / Non-Goals

**Goals:**
- 底部固定状态栏，始终显示最新系统状态
- 日志分级显示：info（蓝）、warning（黄）、error（红）
- Error 消息不自动覆盖，必须用户点击查看见证后才允许新 error 覆盖
- 点击状态栏打开日志详情页，按时间倒序排列
- 日志详情页支持按类型过滤

**Non-Goals:**
- 不存储日志到磁盘（仅内存缓存，保留最近 500 条）
- 不实现日志导出功能
- 不修改现有 Logger 文件日志机制

## Decisions

### 1. 数据流

```
服务器端日志来源 → LogBuffer (环形缓存) 
  ├── 初始加载: GET /api/logs → 返回最近 500 条
  └── 实时推送: WebSocket { type: 'system-log', entry: SystemLogEntry }

前端 StatusBar 组件:
  ├── 从 logs[] 中取最新一条作为当前状态
  ├── 如果最新是 error 且用户未点击查看 → 固定显示，不覆盖
  └── 否则显示最新一条

前端 LogViewer 页面:
  ├── 完整 logs[] 按时间倒序
  ├── 类型筛选: all / info / warning / error
  └── 点击 error 条目 → 标记为已读，允许状态栏覆盖
```

### 2. 日志来源注入

后端在 `src/orchestrator/core.ts` 中收集异常事件并推送到 LogBuffer：

| 来源 | 触发条件 | log 类型 |
|------|---------|---------|
| health 检查失败 | 服务中断/端口不可达 | error |
| WebSocket 连接/重连 | 客户端异常断开 | warning |
| agent session error | 模型调用失败 | error |
| agent 重试 | 任务自动重试 | warning |
| agent hung | session 无响应 | error |
| agent dead | 超过最大重试数 | error |
| 预算超限 | budgetSpent >= budgetLimit | warning |
| API 调用错误 | 接口抛出异常 | error |
| 系统启动/停止 | orchestrator start/stop | info |

### 3. 前端组件结构

```
App.tsx (flex column, 100vh)
├── TopBar
├── PageContent (flex: 1)
└── StatusBar (height: 28px, flexShrink: 0)
```

StatusBar 固定在底部，不随页面切换而消失。

### 4. SystemLogEntry 类型

```typescript
interface SystemLogEntry {
  id: string
  time: number
  type: 'info' | 'warning' | 'error'
  message: string
  source: string  // 来源标识，如 'health', 'agent', 'websocket', 'budget', 'api'
  acknowledged?: boolean  // 用户是否已查看（仅 error 类型需要）
}
```

## Risks / Trade-offs

```

Full source: openspec/changes/system-status-bar/design.md

## openspec/changes/system-status-bar/tasks.md

- Source: openspec/changes/system-status-bar/tasks.md
- Lines: 1-41
- SHA256: e4c32273bbaf096ca5a8330e927630851c9468127f253c41acce53619dd9cf84

```md
## 1. 后端日志系统

- [ ] 1.1 在 `src/webui/src/types.ts` 中增加 SystemLogEntry 类型定义
- [ ] 1.2 在 `src/orchestrator/logger.ts` 中实现 LogBuffer 环形缓存（最近 500 条），支持 push、getAll、按类型过滤
- [ ] 1.3 在 `src/server/api.ts` 增加 `GET /api/logs` 端点
- [ ] 1.4 在 `src/server/websocket.ts` 增加 `system-log` 消息类型，日志推送广播
- [ ] 1.5 在 `src/webui/src/hooks/useWebSocket.ts` 的 WsMessage 中增加 `system-log` 类型

## 2. 日志来源采集

- [ ] 2.1 在 `src/orchestrator/core.ts` 中注入 LogBuffer，采集健康检查失败、agent 错误/重试/hung/dead、预算超限、API 错误
- [ ] 2.2 实现同源同类型 500ms 消息合并

## 3. 底部状态栏组件

- [ ] 3.1 创建 `src/webui/src/components/StatusBar.tsx`，固定底部 28px 高度
- [ ] 3.2 实现颜色分级显示：info=蓝、warning=黄、error=红
- [ ] 3.3 实现 error 不可覆盖逻辑（acknowledged 标记检查）
- [ ] 3.4 实现消息合并计数显示
- [ ] 3.5 实现点击状态栏打开日志详情页

## 4. 日志详情页组件

- [ ] 4.1 创建 `src/webui/src/components/LogViewer.tsx`
- [ ] 4.2 实现按时间倒序展示
- [ ] 4.3 实现类型筛选（all/info/warning/error）
- [ ] 4.4 实现 error 条目点击标记 acknowledged
- [ ] 4.5 实现 WebSocket 实时追加新日志

## 5. App.tsx 集成

- [ ] 5.1 修改 App.tsx 布局，增加 StatusBar 到底部
- [ ] 5.2 集成 system-log WebSocket 消息处理
- [ ] 5.3 集成 GET /api/logs 初始加载
- [ ] 5.4 日志详情页路由

## 6. 验证

- [ ] 6.1 编译验证：TypeScript 类型检查和构建通过
- [ ] 6.2 单元测试：LogBuffer、状态栏渲染、日志筛选
- [ ] 6.3 端到端验证：模拟错误场景确认状态栏显示和覆盖行为
```

## openspec/changes/system-status-bar/specs/system-log-viewer/spec.md

- Source: openspec/changes/system-status-bar/specs/system-log-viewer/spec.md
- Lines: 1-49
- SHA256: 24ea9c7b45246f72e912f01e157a82e4a732abf39bb1622027dbf52cfe2ae421

```md
## ADDED Requirements

### Requirement: 日志详情页面
系统 SHALL 提供一个日志详情页面，按时间倒序展示所有系统日志。

#### Scenario: 时间倒序
- **WHEN** 用户打开日志详情页
- **THEN** 日志按时间倒序排列（最新在最上面）

#### Scenario: 初始加载
- **WHEN** 用户打开日志详情页
- **THEN** 通过 `GET /api/logs` 获取最近 500 条日志

#### Scenario: 实时更新
- **WHEN** 新日志产生
- **THEN** WebSocket `system-log` 消息推送到前端，日志列表实时追加

### Requirement: 类型筛选
日志详情页 SHALL 支持按类型（all/info/warning/error）筛选日志。

#### Scenario: 筛选 all
- **WHEN** 用户选择"全部"
- **THEN** 显示所有日志

#### Scenario: 筛选 info
- **WHEN** 用户选择"info"
- **THEN** 仅显示 info 类型日志

#### Scenario: 筛选 warning
- **WHEN** 用户选择"warning"
- **THEN** 仅显示 warning 类型日志

#### Scenario: 筛选 error
- **WHEN** 用户选择"error"
- **THEN** 仅显示 error 类型日志

### Requirement: 错误确认机制
日志详情页 SHALL 支持用户点击 error 条目标记为已读（acknowledged），从而解除状态栏的 error 固定。

#### Scenario: 标记已读
- **WHEN** 用户在日志详情页点击一条 error 日志
- **THEN** 该日志标记为 acknowledged，状态栏如果显示此 error 则允许被覆盖

### Requirement: 日志条目展示
每条日志 SHALL 展示时间、类型图标/颜色标签、来源、消息内容、计数（如合并）。

#### Scenario: 日志条目格式
- **WHEN** 用户查看日志列表
- **THEN** 每条日志显示：[时间] [类型标签] [来源] 消息内容
```

## openspec/changes/system-status-bar/specs/system-status-bar/spec.md

- Source: openspec/changes/system-status-bar/specs/system-status-bar/spec.md
- Lines: 1-63
- SHA256: 7a22c6bcaa05d89edaf775fbd96bef5328d115cbe3ca7613acf4c1a3de9a18d8

```md
## ADDED Requirements

### Requirement: StatusBar 底部固定显示
系统主界面底部 SHALL 始终显示一个固定高度的状态栏（28px），不随页面切换消失。

#### Scenario: 始终可见
- **WHEN** 用户在主页/设置/项目详情间切换
- **THEN** 底部状态栏始终固定显示

### Requirement: 颜色分级显示
状态栏 SHALL 按日志级别使用不同颜色：info=蓝色(#58a6ff)，warning=黄色(#d29922)，error=红色(#da3633)。

#### Scenario: info 级别
- **WHEN** 最新日志为 info 类型
- **THEN** 状态栏背景或文字为蓝色

#### Scenario: warning 级别
- **WHEN** 最新日志为 warning 类型
- **THEN** 状态栏背景或文字为黄色

#### Scenario: error 级别
- **WHEN** 最新日志为 error 类型
- **THEN** 状态栏背景或文字为红色

### Requirement: Error 消息持久化
Error 级别的日志 SHALL NOT 被新消息自动覆盖。只有用户点击查看并确认后（acknowledged = true）才允许新消息覆盖。

#### Scenario: error 不被覆盖
- **WHEN** 状态栏显示一条 error 消息
- **THEN** 新消息到达时，状态栏继续保持显示该 error

#### Scenario: 用户查看后解除
- **WHEN** 用户点击状态栏打开日志详情页，并点击了该 error 条目
- **THEN** 该 error 标记为 acknowledged，允许被新消息覆盖

### Requirement: 消息合并
高频重复消息 SHALL 被合并。同源同类型 500ms 内多条消息合并为一条，计数加一。

#### Scenario: 消息合并
- **WHEN** 同一 source 同一 type 的消息在 500ms 内多次触发
- **THEN** 合并为一条显示，末尾标注 `(×N)`

### Requirement: 日志来源接入
系统 SHALL 从以下来源采集日志：健康检查失败、WebSocket 异常、agent 错误/重试/hung/dead、预算超限、API 调用错误。

#### Scenario: 健康检查失败
- **WHEN** `GET /health` 返回非 200 或网络异常
- **THEN** 产生一条 type=error 的日志

#### Scenario: Agent 错误
- **WHEN** agent session 发生 error
- **THEN** 产生一条 type=error 的日志

#### Scenario: 服务恢复
- **WHEN** 健康检查从失败恢复为成功
- **THEN** 产生一条 type=info 的日志

### Requirement: 状态栏交互
状态栏 SHALL 支持点击，点击后打开日志详情页面。

#### Scenario: 点击打开日志
- **WHEN** 用户点击状态栏
- **THEN** 打开日志详情页（LogViewer 组件），按时间倒序展示
```

