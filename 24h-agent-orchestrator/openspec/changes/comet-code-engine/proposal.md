## Why

原有 Comet 引擎依赖 bash 脚本进行状态流转和门禁校验，存在以下问题：
1. shell 脚本跨平台兼容性差，调试困难
2. 任务 DAG 调度系统与 Comet 状态机完全不互相校验
3. 右侧监控面板无法展示真实的状态机流转和门禁状态
4. 所有阶段强制走相同流程，没有灵活的工作模式选择
5. ACP 子 Agent 无法通过 skill tool 加载 Comet 技能获取阶段指令

需要将引擎改造为纯 TypeScript 代码驱动的 **Eagle** 系统，从 Comet 独立出来重新命名。

## What Changes

- **重命名**: Comet → Eagle（独立维护，不与原 bash 版 Comet 冲突）
- **skills/eagle/**: 重写技能文件，通过 YAML frontmatter 供 SkillLoader 解析
- **eagle-engine/**: TypeScript 引擎，替代原 comet-engine/
- **eagle-orchestration.json**: 门禁定义，引用 code:xxx 标识
- **core.ts**: Eagle 阶段校验 + ACP skill tool 加载
- **acp-manager.ts**: 创建 session 时传入 permission rules，支持 skill tool
- **SkillLoader**: 解析 skill.md 按 phase 注入专属 prompt
- **settings**: Eagle Mode 设置（auto/manual），config 表存储
- **HealthDashboard**: 状态机 + 决策卡片 + 模式状态
- **SkillChecker**: 设置项目目录时校验: (1) openspec init 是否已执行 (2) .opencode/skills/eagle/ 是否存在 (3) 缺失时复制技能文件到 .opencode/skills/eagle/
- **OpenSpecInitCheck**: 项目目录绑定时检测 `.openspec.yaml`，未初始化时提示执行 openspec init

## Capabilities

### New Capabilities
- `eagle-code-guards`: TypeScript 门禁引擎，各阶段入口/出口校验
- `eagle-phase-machine`: 阶段状态机集成，task 完成触发 transition
- `eagle-visualization`: 右侧面板状态机流程图 + Guard 状态 + 决策交互
- `eagle-mode`: 双模式支持（全自动/人工干预），settings 配置
- `eagle-decision-points`: 决策点引擎，支持自动执行/用户选择
- `eagle-skill-prompts`: 按 phase 加载 skill.md，子 Agent 通过 skill tool 获取阶段指令
- `eagle-skill-checker`: 项目目录初始化时校验 openspec init 和 Eagle 技能完整性
- `eagle-init-flow`: 项目目录绑定时自动检查 openspec init 状态，按需执行 init

### Modified Capabilities
- `orchestrator-core`: dispatchTask + handleSessionComplete 增加阶段校验
- `acp-manager`: session.create() 传入 permission ruleset

## Impact

- Comet bash 脚本方案退役，Eagle 纯代码方案替代
- `skills/eagle/` 项目级独立目录，不与 .opencode/skills 冲突
- ACP 子 Agent 通过 skill tool 加载 Eagle 技能获取约束指令
- 项目目录设置时自动校验 Eagle 技能完整性
- config 表新增 `eagle_mode` 配置项
