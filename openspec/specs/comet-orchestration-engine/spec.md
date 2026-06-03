## ADDED Requirements

### Requirement: 编排引擎核心
系统 SHALL 提供一个编排引擎（CometOrchestrator），从 `comet-orchestration.json` 加载流程定义并驱动 Comet 工作流执行。

#### Scenario: 引擎启动
- **WHEN** 引擎启动
- **THEN** 加载 `comet-orchestration.json` 流程定义，读取当前 change 的 `.comet.yaml`，校验一致后进入当前阶段

#### Scenario: 阶段转换
- **WHEN** 引擎执行阶段转换
- **THEN** 按编排定义顺序执行：前置条件检查 → guard 脚本执行 → 状态机状态更新 → 后置条件检查

#### Scenario: 非法转换拒绝
- **WHEN** 请求执行编排定义中不存在的阶段转换（如 open → verify）
- **THEN** 引擎拒绝转换，返回错误信息

#### Scenario: 预设路径
- **WHEN** 使用 hotfix/tweak preset
- **THEN** 引擎跳过编排定义中 `presets.<name>.skipPhases` 指定的阶段，跳过 `skipGuards` 指定的守卫

### Requirement: JSON 流程编排定义
系统 SHALL 通过 `comet-orchestration.json` 定义完整流程，支持阶段、转换、守卫、决策点、预设路径。

#### Scenario: 编排文件加载
- **WHEN** 引擎加载编排文件
- **THEN** 校验 JSON schema 合法，阶段转换关系无环，preset 引用的阶段/守卫存在

#### Scenario: 阶段定义
- **WHEN** 编排文件定义阶段
- **THEN** 每个阶段包含 label、description、entry（guards + preconditions）、exit（guards + postconditions + transitionTo）、decisionPoints

#### Scenario: 决策点定义
- **WHEN** 编排文件定义决策点
- **THEN** 每个决策点包含 id、prompt、options 列表（label + action + guard），action 支持 transition、modify-artifacts、promote-to-full 等

#### Scenario: 升级规则
- **WHEN** 编排文件定义 upgradeRules
- **THEN** 引擎在执行 preset 路径时自动检查条件，满足时暂停并请求升级

### Requirement: 状态机
系统 SHALL 通过状态机组件（CometStateMachine）管理 `.comet.yaml` 的读写和状态转换验证。

#### Scenario: 状态读取
- **WHEN** 需要获取当前状态
- **THEN** 从 `openspec/changes/<change>/.comet.yaml` 读取阶段信息

#### Scenario: 转换验证
- **WHEN** 请求状态转换
- **THEN** 校验目标阶段在编排定义的允许转换列表中，通过后更新 `.comet.yaml`

#### Scenario: 双写校验
- **WHEN** 状态机写入 `.comet.yaml`
- **THEN** 写入后立即读取验证，确保写入内容与预期一致

### Requirement: 守卫调度器
系统 SHALL 通过守卫调度器（CometGuardScheduler）执行编排定义中引用的 shell 脚本守卫。

#### Scenario: 守卫执行
- **WHEN** 需要执行 guard 脚本
- **THEN** 通过 child_process.execFile 执行，设置 30 秒超时，捕获 stdout/stderr

#### Scenario: 守卫失败
- **WHEN** guard 脚本返回非零退出码
- **THEN** 引擎停止转换流程，返回失败信息和脚本输出

#### Scenario: 守卫定位
- **WHEN** guard 脚本路径为变量名（如 `$COMET_GUARD`）
- **THEN** 调度器解析环境变量，找不到时按 `.opencode/skills/comet/scripts/` 模式搜索

### Requirement: 双重验证机制
每次阶段转换 SHALL 通过编排器校验和状态机校验两条路径。

#### Scenario: 编排器前置校验
- **WHEN** 阶段转换前
- **THEN** 编排器检查编排 JSON 中的 preconditions（文件存在、yaml 字段值匹配）

#### Scenario: 状态机后置校验
- **WHEN** 状态机写入后
- **THEN** 状态机校验 schema 合法、转换路径合法、写入可回读

#### Scenario: 双重路径分离
- **WHEN** 执行校验
- **THEN** 编排器使用 TypeScript 代码实现校验逻辑，状态机通过 `.comet.yaml` 文件系统交互校验，两套实现互不依赖
