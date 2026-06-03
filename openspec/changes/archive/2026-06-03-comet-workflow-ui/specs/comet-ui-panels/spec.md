## ADDED Requirements

### Requirement: 左侧面板 — Comet 阶段任务列表
系统左侧面板 SHALL 展示 Comet 各阶段（open → design → build → verify → archive）的进展和状态。

#### Scenario: 阶段列表展示
- **WHEN** 用户打开主页
- **THEN** 左侧面板展示 Comet 五阶段的垂直列表，每个阶段显示名称、状态图标和进度

#### Scenario: 阶段状态指示
- **WHEN** 当前 change 处于某个阶段
- **THEN** 该阶段标记为 active，已完成阶段标记为 completed，未开始阶段标记为 pending

#### Scenario: 任务子项展示
- **WHEN** 阶段包含子任务
- **THEN** 可展开显示该阶段下的子任务列表及其状态

#### Scenario: 阶段切换
- **WHEN** 用户点击某个阶段
- **THEN** 中间控制台切换显示该阶段的详情和执行日志

### Requirement: 中间控制台 — 决策与执行展示
中间控制台 SHALL 展示任务/子任务的执行情况，以及 AskUserQuestion 决策交互。

#### Scenario: 任务执行展示
- **WHEN** 子任务正在执行
- **THEN** 控制台实时显示执行日志（thinking、tool_call、text 等 chunk 类型）

#### Scenario: AskUserQuestion 决策卡片
- **WHEN** 系统需要用户决策
- **THEN** 控制台渲染决策卡片，包含问题描述和选项按钮（单选/多选）

#### Scenario: 用户确认选择
- **WHEN** 用户点击决策卡片的选项
- **THEN** 系统处理用户选择，继续后续流程

#### Scenario: 多轮决策
- **WHEN** 流程中有多个决策点
- **THEN** 每个决策点独立展示卡片，历史决策可滚动查看

### Requirement: 右侧面板 — Comet 状态监控
右侧面板 SHALL 展示 Comet 工作流的整体状态，预算显示压缩为单行，其余展示 Comet 状态信息。

#### Scenario: 预算单行显示
- **WHEN** 右侧面板渲染
- **THEN** 预算以单行进度条形式展示（如 `预算: ¥1.50 / ¥10.00 ████░░░░ 15%`）

#### Scenario: Comet 状态概览
- **WHEN** 有活跃 change
- **THEN** 面板展示当前 change 名称、工作流类型（full/hotfix/tweak）、当前阶段、验证结果

#### Scenario: 活跃 change 列表
- **WHEN** 有多个活跃 change
- **THEN** 面板列出所有活跃 change 及其状态摘要

#### Scenario: 验证报告入口
- **WHEN** change 已完成验证
- **THEN** 面板显示验证结果（pass/fail）和验证报告链接

#### Scenario: 归档状态展示
- **WHEN** change 已归档
- **THEN** 面板显示归档标记和归档时间

### Requirement: Comet 状态数据同步
系统 SHALL 通过 WebSocket 和 REST API 同步 Comet 状态数据到前端。

#### Scenario: WebSocket 实时推送
- **WHEN** Comet 状态变更
- **THEN** 服务器通过 WebSocket 推送 `comet-state-update` 消息

#### Scenario: REST API 状态查询
- **WHEN** 前端页面加载
- **THEN** 通过 `GET /api/comet/status` 获取完整 Comet 状态

#### Scenario: 文件系统状态读取
- **WHEN** 查询 Comet 状态
- **THEN** 系统从 `.comet.yaml` 和 `openspec/changes/` 读取状态数据
