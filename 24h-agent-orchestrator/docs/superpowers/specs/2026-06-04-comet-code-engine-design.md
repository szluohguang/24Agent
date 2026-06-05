---
comet_change: comet-code-engine
role: technical-design
canonical_spec: openspec
---

## Eagle 引擎架构

### 重命名对照

| Comet（旧） | Eagle（新） | 说明 |
|-------------|------------|------|
| `.opencode/skills/comet/` | `skills/eagle/` | 项目级独立目录 |
| `comet-orchestration.json` | `eagle-orchestration.json` | 门禁定义文件 |
| `src/comet-engine/` | `src/eagle-engine/` | TypeScript 引擎 |
| `CometOrchestrator` | `EagleOrchestrator` | 引擎主类 |
| `CometStateMachine` | `EagleStateMachine` | 状态机 |
| `CometGuardScheduler` | `EagleGuardScheduler` | 门禁调度 |
| `CodeGuards` | `EagleGuards` | 门禁实现 |
| `CometEngineState` | `EagleEngineState` | 前端类型 |
| `/comet` (skill) | `eagle` (skill) | ACP 子 Agent 加载名 |
| `comet-state-update` (WS) | `eagle-state-update` | WebSocket 事件 |
| `comet_mode` (config) | `eagle_mode` | 配置键 |

### 核心架构图

```
┌──────────────────────────────────────────────────────────────┐
│  SETTINGS                                                    │
│  config.eagle_mode: 'auto' | 'manual'                        │
│  存储在 SQLite config 表, 启动时加载, 通过 API 切换           │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  EagleOrchestrator                                           │
│                                                              │
│  transition(targetPhase, mode?)                              │
│    ├── guardStatus = 'running' → emitChange()                │
│    ├── EagleGuards.checkExit(current)                        │
│    ├── passed → write .eagle.yaml → advance phase            │
│    ├── failed → switch(mode)                                 │
│    │   ├── auto:  task 回退 pending, 重新入队                │
│    │   └── manual: 推送 UI, 等待 forceTransition/rollback   │
│    └── emitChange() → broadcast eagle-state-update           │
│                                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  ACP 子 Agent Pipeline (dispatchTask)                         │
│                                                              │
│  1. 校验 task.cometPhase === engine.phase                    │
│  2. SkillLoader.load(phase) → skill.md YAML frontmatter      │
│  3. 构建 prompt:                                              │
│     "你是 Eagle ${title}阶段 Agent。                          │
│      请使用 skill tool 加载 'eagle' 技能。                    │
│      按 eagle-${phase} 子命令执行。                           │
│      职责: ...  禁止: ...  产物: ..."                         │
│  4. createSubAgentSession({ title, permission })              │
│  5. sendTaskPrompt(client, sessionId, prompt)                  │
│  6. 子 Agent 调用 skill tool → 加载 skills/eagle/SKILL.md   │
│  7. 按阶段指令完成工作                                        │
└──────────────────────────────────────────────────────────────┘
```

### SkillLoader 和 Prompt 注入

```
skills/eagle/phases/open.skill.md
  │
  ├── YAML frontmatter:
  │     name: eagle-open
  │     title: 开启
  │     role: Eagle 开启阶段 Agent
  │     responsibilities: [创建 proposal.md, ...]
  │     forbidden: [不写代码, ...]
  │     artifacts: [proposal.md, ...]
  │
  └── Markdown body: 人类可读的详细说明

SkillLoader.load('open')
  │
  ▼ 返回 SkillDef 结构体
  │
  ▼ core.ts:dispatchTask() 用模板渲染 prompt
  │
  "你是 Eagle 开启阶段 Agent。
   请使用 skill tool 加载 'eagle' 技能。
   然后按 eagle-open 子命令执行本阶段工作。
   
   职责:
     - 创建 proposal.md
     - 创建 design.md
     - 创建 tasks.md
   
   禁止:
     - 不允许编写 .ts/.js 等功能代码
   
   任务: ${task.description}
   
   项目上下文: ${projectContext}"
```

### 5 个阶段 Prompt

```
eagle-open (开启)              eagle-design (设计)            eagle-build (构建)
────────────────────           ────────────────────          ─────────────────────
角色: Eagle 开启 Agent         角色: Eagle 设计 Agent         角色: Eagle 构建 Agent

skill: eagle → eagle-open      skill: eagle → eagle-design    skill: eagle → eagle-build

职责:                          职责:                         职责:
- 创建 proposal.md             - 撰写 Design Doc              - 阅读 Design Doc
- 创建 design.md               - 产出 delta spec              - 实现 tasks.md 任务
- 创建 tasks.md                - 生成 handoff                 - 单元测试 + 集成测试
- 初始化 .eagle.yaml           - 确保设计可追溯               - 构建通过

禁止:                         禁止:                         禁止:
- 不写代码                    - 不写实现代码                 - 不改 Design Doc
- 不做技术设计                - 不跳过 brainstorming          - 不超出 spec
                                - 不改 proposal               - 不改 tasks.md 结构


eagle-verify (验证)             eagle-archive (归档)
────────────────────           ────────────────────
角色: Eagle 验证 Agent         角色: Eagle 归档 Agent

skill: eagle → eagle-verify    skill: eagle → eagle-archive

职责:                          职责:
- 生成验证报告                  - delta spec → 主 spec
- 验证实现符合设计              - 标注 Design Doc 状态
- 检查所有测试通过              - 移动 change 到 archive/
- 处理分支策略                  - 清理临时文件

禁止:                         禁止:
- 不写新代码                   - 不修改任何代码
- 不修复 bug（只报告）          - 不创建新文件
- 不改 spec
```

### 项目目录初始化检查（完整流程）

```
用户设置 project directory
  │
  ├── Step 1: OpenSpec init 检查
  │   ├── {projectDir}/.openspec.yaml 存在?
  │   │   ├── 存在 → OK
  │   │   └── 不存在 → 提示 "项目尚未初始化 OpenSpec，需要初始化吗？"
  │   │               → [初始化] 按钮执行: openspec init {projectDir}
  │   │               → [跳过] 但 Eagle 技能安装会继续
  │   │
  ├── Step 2: Eagle skill 检查
  │   ├── {projectDir}/.opencode/skills/eagle/SKILL.md 存在?
  │   │   ├── 存在 → OK（子 Agent 可通过 skill tool "eagle" 加载）
  │   │   └── 不存在 → 从 orchestrator 模板复制:
  │   │       │
  │   │       ├── {orchestratorDir}/skills/eagle/
  │   │       │     → {projectDir}/.opencode/skills/eagle/
  │   │       │
  │   │       ├── {orchestratorDir}/eagle-orchestration.json
  │   │       │     → {projectDir}/eagle-orchestration.json
  │   │       │
  │   │       └── 复制后校验完整性 → 缺失报错
  │   │
  ├── Step 3: Superpowers 技能检查
  │   ├── {projectDir}/.opencode/skills/superpowers/ 存在?
  │   │   ├── 存在 → OK
  │   │   └── 不存在 → 从全局模板复制需要的技能:
  │   │       │
  │   │       ├── {globalSuperpowers}/brainstorming/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/brainstorming/
  │   │       ├── {globalSuperpowers}/test-driven-development/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/test-driven-development/
  │   │       ├── {globalSuperpowers}/writing-plans/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/writing-plans/
  │   │       ├── {globalSuperpowers}/subagent-driven-development/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/subagent-driven-development/
  │   │       ├── {globalSuperpowers}/verification-before-completion/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/verification-before-completion/
  │   │       ├── {globalSuperpowers}/requesting-code-review/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/requesting-code-review/
  │   │       ├── {globalSuperpowers}/finishing-a-development-branch/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/finishing-a-development-branch/
  │   │       ├── {globalSuperpowers}/executing-plans/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/executing-plans/
  │   │       ├── {globalSuperpowers}/using-git-worktrees/
  │   │       │   → {projectDir}/.opencode/skills/superpowers/using-git-worktrees/
  │   │       └── 复制后校验 → 缺失报错
  │   │
  └── Step 4: 存入 project config → 完成
```

### .opencode/skills/eagle/ 目录结构（安装后）

```
{projectDir}/
├── .opencode/
│   └── skills/
│       └── eagle/                    ← 复制到这里才能使 skill tool 识别
│           ├── SKILL.md              ← 主技能定义, /eagle 入口
│           └── phases/
│               ├── open.skill.md     ← phase 定义含 YAML frontmatter
│               ├── design.skill.md
│               ├── build.skill.md
│               ├── verify.skill.md
│               └── archive.skill.md
├── eagle-orchestration.json          ← 门禁定义
└── .openspec.yaml                    ← openspec init 产物
```

### ACP 子 Agent 完整调用链路

```
dispatchTask(taskId):
  │
  ├── task.cometPhase = 'open'
  │
  ├── prompt = renderPrompt(task, skill, projectContext)
  │   "你是 Eagle 开启阶段 Agent。
  │   
  │   请使用 skill tool 加载 'eagle' 技能。
  │   加载路径: .opencode/skills/eagle/SKILL.md
  │   然后执行 eagle-open 子命令。
  │   
  │   职责:
  │     - 创建 proposal.md 说明 Why + What
  │     - 创建 design.md 描述高层架构决策
  │     - 创建 tasks.md 列出可执行任务
  │   
  │   严禁:
  │     - 不允许编写 .ts/.js 等功能代码
  │     - 不允许做技术深挖和详细设计
  │   
  │   任务: ${task.description}
  │
  │   项目上下文: ${projectContext}"
  │
  └── sendTaskPrompt(client, sessionId, prompt)
        │
        ▼
    ACP 子 Agent 收到 prompt:
      │
      1. 调用 skill("eagle")
         │
         ├── opencode 服务器查找 .opencode/skills/eagle/SKILL.md
         ├── 加载 SKILL.md 内容到子 Agent 上下文
         └── 返回完整技能定义
      │
      2. 从 SKILL.md 中找到当前 phase（open）对应的子命令
         │
         ├── eagle-open: 创建 proposal/design/tasks
         ├── eagle-design: 撰写 Design Doc
         ├── eagle-build: 代码实现
         ├── eagle-verify: 生成验证报告
         └── eagle-archive: 归档 change
      │
      3. 使用内置工具执行
         │
         ├── write → 创建 .md 文件
         ├── read  → 了解现有代码
         ├── bash  → 执行命令
         ├── glob  → 查找文件
         └── grep  → 搜索内容
      │
      4. 完成后任务回包
         → orchestrator 收到 completion
         → handleSessionComplete()
         → EagleOrchestrator.transition(nextPhase)
         → 重复步骤 1-4
```

### 前端初始化提示

```
ProjectDirPrompt 组件增强:

┌──────────────────────────────────────────┐
│ 📁 项目目录设置                            │
│                                          │
│ 当前目录: /path/to/project                │
│                                          │
│ ┌────────────────────────────────────────┐│
│ │ ⚠ 项目缺少研发流程配置                  ││
│ │                                        ││
│ │ 需要初始化以下内容:                      ││
│ │ [ ] openspec init（创建 .openspec.yaml）││
│ │ [ ] Eagle 技能安装到 .opencode/skills/  ││
│ │ [ ] Superpowers 技能安装到 .opencode/   ││
│ │     (brainstorming, TDD, writing-plans, ││
│ │      verification, code-review 等)      ││
│ │                                        ││
│ │  [初始化全部]  [跳过]                    ││
│ └────────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

### 双模式行为

```
全自动模式 (auto):
  guard 失败 → task 回退 pending → scheduler 自动重试
  verify fail → rollbackTransition('build') 自动回滚
  决策点 → 默认 action 自动执行

人工干预模式 (manual):
  guard 失败 → 广播到 UI → 用户选择 (重试/强制/回退)
  verify fail → decision card → 用户选择 (修复/接受偏差/回滚)
  决策点 → UI 展示 → 用户点选 → evaluateDecision()
```

### 文件结构

```
skills/eagle/                    # 独立维护的技能目录
├── SKILL.md                     # 主技能定义
└── phases/
    ├── open.skill.md            # YAML frontmatter + 职责/禁止/产物
    ├── design.skill.md
    ├── build.skill.md
    ├── verify.skill.md
    └── archive.skill.md

eagle-orchestration.json         # 门禁定义

24h-agent-orchestrator/
├── src/eagle-engine/
│   ├── EagleOrchestrator.ts     # 主引擎
│   ├── EagleStateMachine.ts     # 状态机 (.eagle.yaml)
│   ├── EagleGuards.ts           # 代码门禁
│   ├── EagleGuardScheduler.ts   # 门禁调度
│   ├── SkillLoader.ts           # skill.md 解析器
│   └── SkillChecker.ts          # 项目 skill 完整性校验
├── src/orchestrator/
│   └── core.ts                  # dispatchTask + handleSessionComplete
├── src/server/
│   └── api.ts                   # GET/POST /api/config/eagle-mode
└── src/webui/src/
    └── components/
        ├── HealthDashboard.tsx  # Eagle 状态机 + 决策卡片
        └── SettingsPage.tsx     # Eagle Mode 选择器
```
