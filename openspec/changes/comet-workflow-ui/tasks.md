## 1. 流程编排 JSON 定义

- [ ] 1.1 设计并创建 `comet-orchestration.json`，定义五阶段（open/design/build/verify/archive）及其 entry/exit/guards/decisionPoints
- [ ] 1.2 在 JSON 中添加 hotfix/tweak preset 定义（skipPhases、skipGuards、upgradeRules）
- [ ] 1.3 添加 JSON schema 校验脚本

## 2. 编排引擎核心

- [ ] 2.1 实现 `src/comet-engine/types.ts` — 编排引擎类型定义（CometOrchestration, Phase, Guard, DecisionPoint 等）
- [ ] 2.2 实现 `src/comet-engine/state-machine.ts` — 状态机：.comet.yaml 读写、转换合法性验证、双写校验
- [ ] 2.3 实现 `src/comet-engine/guard-scheduler.ts` — 守卫调度器：child_process 执行 shell 脚本，超时处理，失败重试
- [ ] 2.4 实现 `src/comet-engine/orchestrator.ts` — 编排器核心：加载 JSON，驱动阶段转换，决策点管理，双重验证

## 3. 命令路由与 API 集成

- [ ] 3.1 扩展 `src/slash/index.ts` — 增加 Comet 命令路由，指向编排引擎
- [ ] 3.2 实现智能命令推断逻辑 — 无明确 / 前缀时推断 Comet 命令类型
- [ ] 3.3 在 `src/server/api.ts` 增加 `GET /api/comet/status` 端点
- [ ] 3.4 在 WebSocket 协议中增加 `comet-state-update` 和 `comet-decision` 消息类型
- [ ] 3.5 服务器端编排状态变更 -> WebSocket 推送集成

## 4. 左侧面板：编排阶段视图

- [ ] 4.1 改造 TreeView.tsx — 增加编排阶段列表模式，由引擎状态驱动
- [ ] 4.2 实现阶段状态指示（active/completed/pending）和进度展示
- [ ] 4.3 实现决策点待处理指示、非法转换按钮禁用
- [ ] 4.4 实现阶段展开/折叠和步骤展示

## 5. 中间控制台：决策交互增强

- [ ] 5.1 在 StreamConsole.tsx 中增加编排执行日志展示
- [ ] 5.2 实现 AskUserQuestion 决策卡片组件（单选/多选按钮）
- [ ] 5.3 实现决策选项通过 WebSocket 发送到引擎
- [ ] 5.4 实现守卫失败红色高亮展示

## 6. 右侧面板：引擎监控

- [ ] 6.1 改造 HealthDashboard.tsx — 预算压缩为单行进度条
- [ ] 6.2 增加引擎状态概览组件（change、phase、workflow type、verify result）
- [ ] 6.3 增加活跃 change 列表组件
- [ ] 6.4 增加归档状态展示

## 7. 状态同步与集成

- [ ] 7.1 实现前端 CometEngineState 管理和面板数据联动
- [ ] 7.2 App.tsx 中三面板数据流整合（引擎状态 → WebSocket → UI）
- [ ] 7.3 双写校验集成到编排器转换流程

## 8. 插件更新功能

- [ ] 8.1 后端实现 `POST /api/plugins/update` 端点，执行 openspec/superpowers 更新
- [ ] 8.2 前端 Settings 页面增加"更新插件"按钮及进度/结果展示

## 9. 验证

- [ ] 9.1 编译验证：TypeScript 类型检查和构建通过
- [ ] 9.2 单元测试：编排引擎核心逻辑（状态机、守卫调度、转换验证）
- [ ] 9.3 UI 验证：三面板布局和交互功能测试
