# Comet — 状态机驱动的变更流程

Comet 是一个 **由代码驱动的 5 阶段状态机**，不再依赖 shell 脚本进行状态流转和门禁校验。

## 核心概念

```
/comet
  ↓ 自动检测
open ──→ design ──→ build ──→ verify ──→ archive
```

每个阶段有明确的**入口门禁**和**出口门禁**，全部由 TypeScript 引擎在内存中校验，不产生 shell 调用。

## 阶段一览

| 阶段 | 命令 | 职责 | 门禁 |
|------|------|------|------|
| open | `/comet-open` | 创建提案、设计稿、任务列表 | 出口：proposal/design/tasks.md 存在 |
| design | `/comet-design` | 技术设计、brainstorming、Design Doc | 出口：handoff context 完整 |
| build | `/comet-build` | 代码实现、测试 | 出口：所有任务完成、构建通过 |
| verify | `/comet-verify` | 验证报告、分支处理 | 出口：验证通过、分支已处理 |
| archive | `/comet-archive` | 同步 spec、归档 change | 出口：无（最终阶段） |

## 引擎架构

```
comet-orchestration.json → CometOrchestrator
  ├── CometStateMachine  → .comet.yaml 读写 + 状态转换
  ├── CodeGuards         → TypeScript 门禁校验（替代 sh 脚本）
  └── GuardScheduler     → 门禁调度器（直接调用 CodeGuards）
```

所有状态转换由以下代码路径控制：
```
handleSessionComplete() → CometOrchestrator.transition()
  → CodeGuards.checkExit(currentPhase)
    → pass: yaml 写入新 phase → broadcast comet-state-update
    → fail: 阻塞转换 → guardStatus=failed → UI 展示失败原因
```

## 使用方式

```bash
# Comet 引擎自动集成在 orchestrator 中
npm run dev   # 启动时自动初始化 CometEngine

# 创建新变更（自动创建 .comet.yaml + openspec artifacts）
/comet-open

# 推进阶段（由任务完成自动触发，无需手动调用）
# 引擎在 handleSessionComplete 中自动执行 transition()
```

## 门禁列表（TypeScript 实现）

所有门禁在 `src/comet-engine/guards.ts` 中实现：

| 门禁名称 | 校验内容 | 代码位置 |
|---------|---------|---------|
| `open-exit` | proposal/design/tasks.md 存在且非空 | `guards.ts#checkOpenExit()` |
| `design-exit` | Design Doc 存在、handoff context 完整 | `guards.ts#checkDesignExit()` |
| `build-exit` | isolation/mode 已设置、tasks 全部完成、构建通过 | `guards.ts#checkBuildExit()` |
| `verify-exit` | 验证报告存在、branch 已处理 | `guards.ts#checkVerifyExit()` |
