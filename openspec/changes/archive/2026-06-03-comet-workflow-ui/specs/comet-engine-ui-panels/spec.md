## ADDED Requirements

### Requirement: 左侧面板 — 编排阶段列表
系统左侧面板 SHALL 由编排引擎状态驱动，展示 Comet 各阶段的进展和状态。

#### Scenario: 阶段列表展示
- **WHEN** 用户打开主页
- **THEN** 左侧面板展示编排引擎定义的 phases 列表，每个阶段显示名称、状态图标（active/completed/pending）、进度

#### Scenario: 阶段状态驱动
- **WHEN** 编排引擎状态变更
- **THEN** 左侧面板跟随更新，当前阶段标记为 active，已完成阶段标记为 completed

#### Scenario: 决策点指示
- **WHEN** 当前阶段有未处理的决策点（decisionPoints）
- **THEN** 阶段标签上显示等待图标，提示用户需要决策

#### Scenario: 子项展示
- **WHEN** 阶段包含多个步骤
- **THEN** 可展开查看步骤列表及其完成状态

#### Scenario: 非法转换禁用
- **WHEN** 用户点击的阶段不在编排定义的允许转换列表中
- **THEN** 该阶段按钮禁用，悬停显示不可达原因

### Requirement: 中间控制台 — 决策交互与执行日志
中间控制台 SHALL 展示编排引擎的执行日志和决策点交互控件。

#### Scenario: 编排执行日志
- **WHEN** 编排引擎执行阶段转换
- **THEN** 控制台实时显示执行步骤（检查前置条件 → 运行 guard → 更新状态 → 检查后置条件）

#### Scenario: AskUserQuestion 决策卡片
- **WHEN** 编排引擎到达决策点
- **THEN** 控制台渲染决策卡片，显示编排 JSON 中定义的 prompt 和 options，用户选择后引擎调用 evaluateDecision()

#### Scenario: 决策回传
- **WHEN** 用户点击决策卡片的选项
- **THEN** 通过 WebSocket 发送 `comet-decision` 消息，引擎处理后续流程

#### Scenario: 守卫失败展示
- **WHEN** guard 脚本执行失败
- **THEN** 控制台红色高亮显示失败原因和脚本输出

### Requirement: 右侧面板 — 编排引擎监控
右侧面板 SHALL 展示编排引擎的整体运行状态，预算显示压缩为单行进度条。

#### Scenario: 预算单行显示
- **WHEN** 右侧面板渲染
- **THEN** 预算以单行进度条形式展示（如 `预算: ¥1.50 / ¥10.00 ████░░░░ 15%`）

#### Scenario: 引擎状态概览
- **WHEN** 编排引擎运行中
- **THEN** 面板展示：当前 change 名称、工作流类型（full/hotfix/tweak）、当前阶段名称、阶段 ID

#### Scenario: 活跃 change 列表
- **WHEN** 有多个活跃 change
- **THEN** 面板列出所有活跃 change，每个显示名称、当前阶段、状态摘要

#### Scenario: 验证报告入口
- **WHEN** `.comet.yaml` 中 verify_result 不为 pending
- **THEN** 面板显示验证结果（pass/fail）和验证报告路径

#### Scenario: 归档状态
- **WHEN** `.comet.yaml` 中 archived: true
- **THEN** 面板显示归档标记和归档时间

### Requirement: Settings — 更新插件按钮
Settings 页面 SHALL 包含"更新插件"按钮，用于从上游仓库更新 openspec、superpowers 及相关 skill。

#### Scenario: 点击更新插件
- **WHEN** 用户在 Settings 页面点击"更新插件"按钮
- **THEN** 调用 `POST /api/plugins/update` 端点，前端显示更新进度和结果

#### Scenario: 更新成功
- **WHEN** 插件更新完成且成功
- **THEN** 前端显示"更新成功"提示

#### Scenario: 更新失败
- **WHEN** 插件更新失败
- **THEN** 前端显示错误信息

### Requirement: 编排状态同步
系统 SHALL 通过 WebSocket 实时同步编排引擎状态到前端。

#### Scenario: 状态推送
- **WHEN** 编排引擎状态变更（阶段转换、决策点到达、guard 执行）
- **THEN** 通过 WebSocket 推送 `comet-state-update` 消息，包含完整引擎状态

#### Scenario: 初始加载
- **WHEN** 前端页面加载
- **THEN** 调用 `GET /api/comet/status` 获取引擎当前状态

#### Scenario: 决策发送
- **WHEN** 用户做出决策选择
- **THEN** 前端发送 `{type: 'comet-decision', decisionId, choice}` WebSocket 消息
