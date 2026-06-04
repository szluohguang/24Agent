# Eagle — 状态机驱动的变更流程

Eagle 是一个 **由代码驱动的 5 阶段状态机**，替代原有的 Comet bash 脚本方案，使用纯 TypeScript 代码进行状态流转和门禁校验。

## 核心概念

```
/eagle
  ↓ 自动检测
open ──→ design ──→ build ──→ verify ──→ archive
```

每个阶段有明确的**入口门禁**和**出口门禁**，全部由 TypeScript 引擎在内存中校验，不产生 shell 调用。

ACP 子 Agent 通过 **skill tool** 加载 Eagle 技能后，严格按照当前阶段执行对应职责。

## 阶段一览

| 阶段 | 技能命令 | 角色 | 职责 | 门禁 |
|------|---------|------|------|------|
| open | `eagle-open` | Eagle 开启阶段 Agent | 创建提案、设计稿、任务列表 | 出口：proposal/design/tasks.md 存在 |
| design | `eagle-design` | Eagle 设计阶段 Agent | 技术设计、brainstorming、Design Doc | 出口：handoff context 完整 |
| build | `eagle-build` | Eagle 构建阶段 Agent | 代码实现、测试 | 出口：所有任务完成、构建通过 |
| verify | `eagle-verify` | Eagle 验证阶段 Agent | 验证报告、分支处理 | 出口：验证通过、分支已处理 |
| archive | `eagle-archive` | Eagle 归档阶段 Agent | 同步 spec、归档 change | 出口：无（最终阶段） |

## 引擎架构

```
eagle-orchestration.json → EagleOrchestrator
  ├── EagleStateMachine  → .eagle.yaml 读写 + 状态转换
  ├── EagleGuards        → TypeScript 门禁校验（替代 sh 脚本）
  └── EagleStateTransition → 状态转换器（自动/人工双模式）
```

所有状态转换由以下代码路径控制：
```
handleSessionComplete() → EagleOrchestrator.transition()
  → EagleGuards.checkExit(currentPhase)
    → pass: yaml 写入新 phase → broadcast eagle-state-update
    → fail: mode=auto 回退任务 / mode=manual 显示到 UI
```

## ACP 子 Agent 调用方式

```
dispatchTask(taskId):
  │
  ├── task.cometPhase = 'open'
  ├── prompt = 
  │     "你是 Eagle 开启阶段 Agent。
  │      请使用 skill tool 加载 'eagle' 技能。
  │      然后按照 eagle-open 的指示执行本阶段工作。
  │      禁止越界操作（详见 skill 定义）。
  │      项目上下文：..."
  │
  └── sendTaskPrompt(client, sessionId, prompt)
        │
        ▼
    ACP 子 Agent:
      1. 调用 skill tool → 加载 'eagle'
      2. 从 skills/eagle/SKILL.md 获取完整指令
      3. 按当前 phase 子命令执行
      4. 使用 write/read/bash 等内置工具完成任务
```

## 门禁列表（TypeScript 实现）

所有门禁在 `src/eagle-engine/guards.ts` 中实现：

| 门禁名称 | 校验内容 | 代码位置 |
|---------|---------|---------|
| `open-exit` | proposal/design/tasks.md 存在且非空 | `EagleGuards.checkOpenExit()` |
| `design-exit` | Design Doc 存在、handoff context 完整 | `EagleGuards.checkDesignExit()` |
| `build-exit` | isolation/mode 已设置、tasks 全部完成、构建通过 | `EagleGuards.checkBuildExit()` |
| `verify-exit` | 验证报告存在、branch 已处理 | `EagleGuards.checkVerifyExit()` |
