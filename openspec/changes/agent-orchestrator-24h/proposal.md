# 24h Agent Orchestrator — 提案

## 问题

目前缺少一个能打通 OpenSpec 规划 → ACP 子 Agent 分发 → 目标驱动评估 完整闭环的 24/7 自动化编排系统。

## 解决方案

基于 Node.js 的编排进程，实现以下能力：
1. 通过 OpenSpec 定义目标、规格和任务
2. 基于 opencode 内置 ACP 协议（REST API + SSE）分发子 Agent
3. 双层结果校验（子 Agent 自评 + 主 Agent LLM 复核）
4. 提供 WebUI 实现实时观测和人工介入

## 架构总览

```
主 Agent (Node.js + WebUI)
├── OpenSpec CLI → proposal / design / tasks
├── @opencode-ai/sdk → ACP server + client
│   ├── session.create() → 每任务一个子 session
│   ├── session.prompt() → 分发工作
│   ├── global.event() SSE → 实时流
│   └── session.messages() / diff() → 结果收集
├── DAG 调度器 → 依赖感知的并行分发
├── 观测引擎 → 事件处理 + 目标评估
├── 弹性层 → 重试、超时、预算控制
└── WebUI → 树形视图、流式控制台、权限处理
```

## 范围

### Phase 1（本次变更）
- 项目骨架（TypeScript + Fastify + Vite + React）
- opencode SDK 集成（单 server）
- WebUI 基础（WebSocket、树形视图、流式控制台）
- 单任务分发（创建会话 → 发 prompt → 等待 → 获取结果）

### 后续阶段
- Phase 2：DAG 调度器、OpenSpec 集成、结果评估
- Phase 3：弹性能力（重试、超时、预算、持久化）
- Phase 4：完整人工交互、历史记录、通知

## 非目标
- 替换 opencode 自身的 TUI 或 CLI
- 支持 opencode ACP 之外的 Agent 协议
- 多项目编排
