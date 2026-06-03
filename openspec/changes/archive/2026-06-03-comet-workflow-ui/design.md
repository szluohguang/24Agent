## Context

### 现状问题

Comet 双星开发流程的流程控制目前完全依赖 AI agent 阅读 SKILL.md 自然语言描述后自行理解执行。这种模式存在根因缺陷：

1. **软约束无强制力** — skill 中写"× 必须使用 AskUserQuestion"，模型仍然可以用文字输出代替
2. **状态漂移不可控** — agent 在长上下文中丢失阶段信息，跳步/漏步无法检测
3. **流程不可编程** — 无法在运行前验证流程合法性，无法手动干预
4. **不可观测** — 流程执行状态埋没在对话历史中，无结构化输出

### 解决思路

将 Comet 流程控制拆分为三层：

```
┌─────────────────────────────────────────┐
│           编排定义层 (JSON)               │
│  comet-orchestration.json               │
│  阶段 / 转换 / 守卫 / 决策点 / 条件        │
└────────────────┬────────────────────────┘
                 │ 加载
┌────────────────▼────────────────────────┐
│           编排执行层 (TypeScript)          │
│  Orchestrator  — 解释编排文件驱动流程      │
│  StateMachine — .comet.yaml 状态验证      │
│  GuardScheduler — 调用 shell 守卫脚本     │
└────────────────┬────────────────────────┘
                 │ API / WS
┌────────────────▼────────────────────────┐
│           UI 展示层 (React)              │
│  左侧阶段面板 / 中间决策控制台 / 右侧监控   │
└─────────────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- 新增 `src/comet-engine/` 编排引擎模块，代码强制约束流程
- `comet-orchestration.json` 定义完整流程，引擎解释执行
- 每次阶段转换通过"代码校验 + 状态机校验"双重验证
- 三面板 UI 由引擎状态驱动，而非模型文字输出驱动
- 支持手动编排（编辑 JSON 调整流程）和未来自动化编排

**Non-Goals:**
- 不替换现有 comet shell 脚本（guard/state/handoff/archive），引擎调用它们
- 不修改 OpenSpec 文件存储结构
- 不引入第三方工作流引擎（自研轻量级）
- 不实现可视化流程编辑器（仅 JSON 编辑）

## Decisions

### 架构

```
src/comet-engine/
├── types.ts              # 编排引擎类型定义
├── orchestrator.ts        # 编排器核心
├── state-machine.ts       # 状态机
├── guard-scheduler.ts     # 守卫调度器
└── __tests__/             # 引擎单元测试
```

### 1. JSON 编排文件格式 (`comet-orchestration.json`)

```json
{
  "schema": "comet-orchestration-v1",
  "initialPhase": "open",
  "phases": {
    "open": {
      "label": "开启",
      "description": "探索想法，创建 Change 结构",
      "entry": {
        "guards": ["comet-state.sh check <change> open"],
        "preconditions": [
          "openspec/changes/<change>/proposal.md exists",
          "openspec/changes/<change>/.comet.yaml phase=open"
        ],
        "autoCreate": ["proposal.md", "design.md", "tasks.md"]
      },
      "exit": {
        "guards": ["comet-guard.sh <change> open --apply"],
        "postconditions": ["phase == design", "all artifacts complete"],
        "transitionTo": "design"
      },
      "decisionPoints": [
        {
          "id": "open-review",
          "prompt": "审视 proposal/design/tasks 是否符合预期",
          "options": [
            {"label": "确认", "action": "transition:design", "guard": "open-review-pass"},
            {"label": "调整", "action": "modify-artifacts", "loop": true}
          ]
        }
      ]
    },
    "design": { ... },
    "build": { ... },
    "verify": { ... },
    "archive": { ... }
  },
  "presets": {
    "hotfix": {
      "extends": "full",
      "skipPhases": ["design"],
      "upgradeRules": [
        {"condition": "files >= 3 OR schema-change OR new-api", "action": "promote-to-full"}
      ]
    },
    "tweak": {
      "extends": "full",
      "skipPhases": ["design"],
      "skipGuards": ["build-plan"],
      "upgradeRules": [
        {"condition": "files >= 5 OR modules >= 2 OR tests >= 5", "action": "promote-to-full"}
      ]
    }
  }
}
```

**关键设计**：
- guard = 脚本路径，引擎用 child_process 执行；非零退出码 = 失败
- preconditions/postconditions = 用 DSL 描述文件存在性、yaml 字段值
- decisionPoints = 阻塞点，引擎暂停并等待 UI 反馈后才继续
- presets.hotfix/tweak = 预设路径，继承 full 但跳过阶段/守卫
- upgradeRules = 升级条件，引擎自动检测并暂停请求升级

### 2. 编排器核心 (`orchestrator.ts`)

```typescript
class CometOrchestrator {
  private state: CometEngineState;
  private changeName: string;

  async start(): Promise<void>;
  async transition(targetPhase: string): Promise<TransitionResult>;
  async executeGuard(guardName: string): Promise<GuardResult>;
  async evaluateDecision(decisionId: string, choice: string): Promise<void>;
  getCurrentState(): CometEngineState;
  onStateChange(callback: (state: CometEngineState) => void): void;
}
```

- 加载 `comet-orchestration.json` + 当前 change 的 `.comet.yaml`
- `transition()` 按编排定义执行：前置条件 → guard → 状态更新 → 后置条件
- 不支持任意跳转，只允许编排文件中定义的 `transitionTo` 路径
- 决策点到达时，引擎进入 WAITING 状态，等待外部输入（UI/API/微信）

### 3. 状态机 (`state-machine.ts`)

```typescript
class CometStateMachine {
  private yamlPath: string;

  async readState(): Promise<CometYamlState>;
  async transition(event: StateEvent): Promise<void>;
  validateTransition(from: Phase, to: Phase): boolean;
  get allowedTransitions(): Map<Phase, Phase[]>;
}
```

- 读取和写入 `.comet.yaml`
- 验证转换合法性（只允许编排定义中的转换路径）
- 每次写入同时校验 schema

**双重验证机制**：
```
编排器校验 (orchestrator.ts)
  ├── 前置条件检查 (preconditions in JSON)
  ├── guard 脚本执行 (非零退出码 = 失败)
  └── 后置条件检查 (postconditions in JSON)
        │
        ▼
状态机校验 (state-machine.ts)
  ├── 当前阶段是否在允许转换列表中?
  ├── YAML schema 是否合法?
  └── 写入后是否能被 guard 重新读取验证?
```

两次验证使用不同的实现路径（TypeScript vs Shell），防止单点失效。

### 4. 守卫调度器 (`guard-scheduler.ts`)

```typescript
class CometGuardScheduler {
  async runGuard(guardScript: string, changeName: string, phase: string): Promise<GuardResult>;
  async runAllGuards(guards: string[], changeName: string, phase: string): Promise<AggregateResult>;
}
```

- 用 child_process.execFile 执行 shell 脚本
- 设置超时（默认 30s）
- 捕获 stdout/stderr 返回结构化结果
- guard 脚本定位：优先 $COMET_GUARD，失败时查找 .opencode/skills/comet/scripts/

### 5. 三面板 UI 数据流

```
                    ┌──────────────────┐
                    │  CometOrchestrator │
                    └────────┬─────────┘
                             │ onStateChange
                             ▼
                    ┌──────────────────┐
                    │   WebSocket      │
                    │ comet-state-update│
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │   App.tsx        │
                    │ cometState:      │
                    │ CometEngineState │
                    ├─────┬──────┬─────┤
                    │     │      │     │
                    ▼     ▼      ▼     ▼
              TreeView  Stream  Health  Decision
              (阶段列表) (日志)  (监控)  (卡片)
```

- 引擎状态变更 → WebSocket 广播 `comet-state-update` → 前端更新三面板
- 用户在决策卡片选择 → WebSocket 发送选择 → 引擎调用 `evaluateDecision()`
- 编排引擎不存储 UI 状态，只存储流程状态（.comet.yaml）

### 6. 命令路由集成

slash/index.ts 扩展：

```
/comet              → CometOrchestrator.start()（自动检测）
/comet-open         → 进入 open 阶段
/comet-design       → 进入 design 阶段
/comet-build        → 进入 build 阶段
/comet-verify       → 进入 verify 阶段
/comet-archive      → 进入 archive 阶段
/comet-hotfix       → 加载 hotfix preset 进入 build
/comet-tweak        → 加载 tweak preset 进入 lightweight build
```

- 所有路由最终指向编排引擎，由引擎校验合法性
- 非法转换（如 open → verify）被引擎拒绝

### 7. 插件更新机制

Settings 页面增加"更新插件"按钮，用于从上游仓库更新 openspec 和 superpowers。

**实现方式**：
- 后端新增 `POST /api/plugins/update` 端点
- 执行 `git pull` 或 `npx openspec update` 等命令更新
- 前端显示更新进度和结果（成功/失败）

**不自动更新** — 设按钮而非自动检查，避免中断正在执行的工作流。

## Risks / Trade-offs

- **[编排引擎复杂度]** 自研轻量引擎增加初期开发量，但为后续自动化和手动编排奠定基础 → 保持引擎聚焦流程控制，不引入 DAG/调度等通用能力
- **[JSON 编排漂移]** JSON 和 .comet.yaml 可能不一致 → 引擎启动时自动校验一致性，不一致时拒绝执行
- **[Shell 脚本依赖]** guard 调度依赖本地 shell 环境和脚本路径 → GuardScheduler 提供 fallback 路径搜索
- **[双重验证性能]** 每次转换执行两次验证可能增加延迟 → guard 通常 < 100ms，可接受
