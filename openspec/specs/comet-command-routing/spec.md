## ADDED Requirements

### Requirement: Comet 命令解析与路由
系统 SHALL 解析用户输入中的 `/comet-xxx` 前缀命令，并将其分发到对应的 Comet 工作流阶段。

支持的 Comet 命令：`/comet-open`, `/comet-design`, `/comet-build`, `/comet-verify`, `/comet-archive`, `/comet-hotfix`, `/comet-tweak`, `/comet`（自动检测）。

#### Scenario: 明确输入 /comet 命令
- **WHEN** 用户输入以 `/comet-` 开头
- **THEN** 系统将命令及其参数传递给 Comet 工作流引擎执行

#### Scenario: 输入 /comet 无子命令
- **WHEN** 用户输入 `/comet`（无子命令）
- **THEN** 系统执行阶段自动检测流程（Step 0 → Step 1 → Step 2）

#### Scenario: 非 / 前缀输入
- **WHEN** 用户输入不以 `/` 开头
- **THEN** 系统执行智能命令推断

### Requirement: 智能命令推断
当用户输入不以 `/` 开头时，系统 SHALL 根据上下文判断可能的 Comet 命令类型，让用户确认后执行。

#### Scenario: 描述匹配 comet 命令
- **WHEN** 用户输入描述性文本（如"我要修复一个 bug"）
- **THEN** 系统推断可能匹配 `/comet-hotfix`，询问用户确认

#### Scenario: 用户拒绝推断
- **WHEN** 用户拒绝系统推断的 Comet 命令
- **THEN** 系统回退到普通任务创建流程

#### Scenario: 用户确认推断
- **WHEN** 用户确认系统推断的 Comet 命令
- **THEN** 系统按确认的 Comet 命令执行对应工作流

### Requirement: 命令参数透传
系统 SHALL 将 Comet 命令后的参数原样传递到对应的 Comet 工作流。

#### Scenario: 带参数的命令
- **WHEN** 用户输入 `/comet-open 参考comet工程代码的核心流程，实现如下要求`
- **THEN** 系统将 `参考comet工程代码的核心流程，实现如下要求` 作为参数传递给 open 阶段

### Requirement: 任务拆解与分发
系统 SHALL 根据 Comet 命令将工作拆解为子任务，并分发到子 agent 执行。

#### Scenario: 按阶段拆解
- **WHEN** 系统确认 Comet 命令类型
- **THEN** 系统按对应阶段的产物要求拆解任务（如 open 阶段需创建 proposal/design/tasks）

#### Scenario: 子任务跟踪
- **WHEN** 任务被拆解为子任务
- **THEN** 每个子任务的状态（pending/running/completed/failed）被跟踪并在 UI 中展示
