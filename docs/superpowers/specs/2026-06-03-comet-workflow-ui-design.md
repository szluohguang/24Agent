---
comet_change: comet-workflow-ui
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-03-comet-workflow-ui
status: final
---

## 架构概览

```
┌──────────────────────────────────────────────┐
│              comet-orchestration.json          │ 编排定义
└──────────────┬───────────────────────────────┘
               │ 加载
┌──────────────▼───────────────────────────────┐
│              CometOrchestrator                 │ 编排核心
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │ StateMachine │  │   GuardScheduler     │   │
│  │ .comet.yaml  │  │   shell 脚本执行      │   │
│  │ 读写+校验    │  │   超时/失败处理       │   │
│  └─────────────┘  └──────────────────────┘   │
└──────────────┬───────────────────────────────┘
               │ WebSocket / API
┌──────────────▼───────────────────────────────┐
│  WebUI 三面板（逐步替换）                      │
│  右: Comet 状态 + 预算一行   →  第1步         │
│  左: 编排阶段列表            →  第2步         │
│  中: 决策卡片 + 执行日志     →  第3步         │
└──────────────────────────────────────────────┘
```

## 模块职责

### orchestrator.ts
- 加载 `comet-orchestration.json` 和 `.comet.yaml`
- 驱动阶段转换：前置条件 → guard → 状态更新 → 后置条件
- 管理决策点：到达决策点进入 WAITING，等待外部输入
- 状态变更时通过 WebSocket 推送 `comet-state-update`

### state-machine.ts
- 封装 `.comet.yaml` 的读写
- 校验转换合法性（只允许编排 JSON 定义的路径）
- 双写校验：写入后立即读取验证一致性

### guard-scheduler.ts
- 执行编排 JSON 中定义的 guard shell 脚本
- child_process.execFile，30s 超时
- 失败时返回结构化错误信息

## 数据流

```
User Input → SlashHandler → CometOrchestrator.transition()
  → StateMachine.validateTransition()
  → GuardScheduler.runGuard()
  → StateMachine.writeState()
  → WebSocket.push("comet-state-update")
  → UI updates all three panels
```

## 实现顺序

1. json 编排定义 → 2. state-machine → 3. guard-scheduler → 4. orchestrator → 5. 命令路由/API → 6. 右面板 → 7. 左面板 → 8. 中面板 → 9. 插件更新 → 10. 验证

## 关键约束

- 非法转换被引擎拒绝（不依赖模型判断）
- 决策点必须通过 UI 卡片交互（不依赖模型文字回复）
- guard 失败阻断流程（不依赖模型"注意到错误"）
- 双重校验路径独立（TypeScript + Shell/YAML）
