---
change: comet-workflow-ui
design-doc: docs/superpowers/specs/2026-06-03-comet-workflow-ui-design.md
base-ref: 569fc2b5e18ce105932d31e6cb9ec4b97bbf03e5
archived-with: 2026-06-03-comet-workflow-ui
---

# Comet Workflow UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Comet workflow orchestration engine and UI panels to the 24h-agent-orchestrator.

**Architecture:** New `src/comet-engine/` module with three classes (CometOrchestrator, CometStateMachine, CometGuardScheduler), a `comet-orchestration.json` defining the five-phase workflow, and gradual replacement of the three WebUI panels.

**Tech Stack:** TypeScript, Fastify (API), React 19 (WebUI), child_process (guard execution)

archived-with: 2026-06-03-comet-workflow-ui
---

## File Structure

**New files to create:**
- `comet-orchestration.json` — workflow orchestration definition
- `src/comet-engine/types.ts` — type definitions for the engine
- `src/comet-engine/state-machine.ts` — .comet.yaml state management
- `src/comet-engine/guard-scheduler.ts` — shell guard script execution
- `src/comet-engine/orchestrator.ts` — orchestration core
- `src/comet-engine/__tests__/state-machine.test.ts` — state machine unit tests
- `src/comet-engine/__tests__/guard-scheduler.test.ts` — guard scheduler unit tests
- `src/comet-engine/__tests__/orchestrator.test.ts` — orchestrator unit tests

**Files to modify:**
- `src/slash/index.ts` — add comet command routing
- `src/server/api.ts` — add `GET /api/comet/status` and `POST /api/plugins/update`
- `src/server/websocket.ts` — add `comet-state-update` and `comet-decision` message types
- `src/orchestrator/core.ts` — integrate CometOrchestrator
- `src/webui/src/types.ts` — add Comet engine types
- `src/webui/src/App.tsx` — integrate engine state into three panels
- `src/webui/src/components/HealthDashboard.tsx` — add comet status, compress budget to one line
- `src/webui/src/components/TreeView.tsx` — add phase list mode
- `src/webui/src/components/StreamConsole.tsx` — add decision card rendering
- `src/webui/src/components/SettingsPage.tsx` — add "Update Plugins" button

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 1: Create comet-orchestration.json

**Files:**
- Create: `comet-orchestration.json`

- [ ] **Step 1: Create the orchestration JSON**

```json
{
  "schema": "comet-orchestration-v1",
  "initialPhase": "open",
  "phases": {
    "open": {
      "label": "开启",
      "description": "探索想法，创建 Change 结构",
      "entry": {
        "guards": [],
        "preconditions": []
      },
      "exit": {
        "guards": ["comet-guard.sh <change> open --apply"],
        "postconditions": ["phase == design"],
        "transitionTo": "design"
      },
      "decisionPoints": [
        {
          "id": "open-review",
          "prompt": "审视 proposal/design/tasks 是否符合预期",
          "options": [
            {"label": "确认", "action": "transition:design"},
            {"label": "调整", "action": "modify-artifacts", "loop": true}
          ]
        }
      ]
    },
    "design": {
      "label": "深度设计",
      "description": "技术设计、brainstorming、Design Doc",
      "entry": {
        "guards": ["comet-state.sh check <change> design"],
        "preconditions": ["proposal.md exists", "design.md exists"]
      },
      "exit": {
        "guards": ["comet-guard.sh <change> design --apply"],
        "postconditions": ["phase == build"],
        "transitionTo": "build"
      },
      "decisionPoints": [
        {
          "id": "design-review",
          "prompt": "确认技术设计方案",
          "options": [
            {"label": "确认", "action": "transition:build"},
            {"label": "调整", "action": "modify-artifacts", "loop": true}
          ]
        }
      ]
    },
    "build": {
      "label": "计划与构建",
      "description": "制定计划、编写代码、测试",
      "entry": {
        "guards": [],
        "preconditions": ["design_doc exists"]
      },
      "exit": {
        "guards": ["comet-guard.sh <change> build --apply"],
        "postconditions": ["phase == verify"],
        "transitionTo": "verify"
      },
      "decisionPoints": [
        {
          "id": "build-mode-select",
          "prompt": "选择隔离方式和执行方式",
          "options": [
            {"label": "分支 + Subagent", "action": "set:isolation=branch,mode=subagent-driven-development"},
            {"label": "分支 + 直行", "action": "set:isolation=branch,mode=executing-plans"},
            {"label": "Worktree + Subagent", "action": "set:isolation=worktree,mode=subagent-driven-development"},
            {"label": "Worktree + 直行", "action": "set:isolation=worktree,mode=executing-plans"}
          ]
        }
      ]
    },
    "verify": {
      "label": "验证与收尾",
      "description": "验证实现、处理分支",
      "entry": {
        "guards": [],
        "preconditions": ["tasks.md all checked"]
      },
      "exit": {
        "guards": ["comet-guard.sh <change> verify --apply"],
        "postconditions": ["verify_result != pending"],
        "transitionTo": "archive"
      },
      "decisionPoints": [
        {
          "id": "verify-result",
          "prompt": "验证结果处理",
          "options": [
            {"label": "通过", "action": "transition:archive"},
            {"label": "失败-修复", "action": "transition:build", "loop": true},
            {"label": "接受偏差", "action": "transition:archive"}
          ]
        }
      ]
    },
    "archive": {
      "label": "归档",
      "description": "同步 spec、标记文档、归档 change",
      "entry": {
        "guards": [],
        "preconditions": ["verify_result == pass"]
      },
      "exit": {
        "guards": [],
        "postconditions": ["archived == true"],
        "transitionTo": null
      },
      "decisionPoints": [
        {
          "id": "finish-branch",
          "prompt": "选择分支处理方式",
          "options": [
            {"label": "合并到主分支", "action": "merge"},
            {"label": "创建 PR", "action": "create-pr"},
            {"label": "保留分支", "action": "keep-branch"}
          ]
        }
      ]
    }
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

- [ ] **Step 2: Commit**

```bash
git add comet-orchestration.json
git commit -m "feat: add comet orchestration JSON definition"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 2: Implement CometEngine types

**Files:**
- Create: `src/comet-engine/types.ts`

- [ ] **Step 1: Create type definitions**

```typescript
export type CometPhase = 'open' | 'design' | 'build' | 'verify' | 'archive'
export type CometWorkflow = 'full' | 'hotfix' | 'tweak'
export type BuildMode = 'subagent-driven-development' | 'executing-plans' | 'direct'
export type Isolation = 'branch' | 'worktree'
export type VerifyResult = 'pending' | 'pass' | 'fail'
export type BranchStatus = 'pending' | 'handled'

export interface CometPhaseDecision {
  id: string
  prompt: string
  options: CometDecisionOption[]
}

export interface CometDecisionOption {
  label: string
  action: string
  loop?: boolean
}

export interface CometPhaseDefinition {
  label: string
  description: string
  entry: { guards: string[]; preconditions: string[] }
  exit: { guards: string[]; postconditions: string[]; transitionTo: string | null }
  decisionPoints: CometPhaseDecision[]
}

export interface CometOrchestration {
  schema: string
  initialPhase: CometPhase
  phases: Record<CometPhase, CometPhaseDefinition>
  presets: Record<string, CometPreset>
}

export interface CometPreset {
  extends: string
  skipPhases: string[]
  skipGuards?: string[]
  upgradeRules: CometUpgradeRule[]
}

export interface CometUpgradeRule {
  condition: string
  action: string
}

export interface CometYamlState {
  workflow: CometWorkflow
  phase: CometPhase
  design_doc: string | null
  plan: string | null
  base_ref: string | null
  build_mode: BuildMode | null
  isolation: Isolation | null
  verify_mode: 'light' | 'full' | null
  verify_result: VerifyResult
  verification_report: string | null
  branch_status: BranchStatus
  created_at: string | null
  verified_at: string | null
  archived: boolean
  handoff_context?: string
  handoff_hash?: string
}

export interface CometEngineState {
  changeName: string
  phase: CometPhase
  workflow: CometWorkflow
  phases: Record<string, { status: 'pending' | 'active' | 'completed'; progress: number }>
  activeDecision: CometPhaseDecision | null
  guardStatus: 'idle' | 'running' | 'passed' | 'failed'
  guardOutput: string | null
}

export type CometDecisionChoice = {
  decisionId: string
  choice: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/comet-engine/types.ts
git commit -m "feat: add CometEngine type definitions"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 3: Implement CometStateMachine

**Files:**
- Create: `src/comet-engine/state-machine.ts`
- Create: `src/comet-engine/__tests__/state-machine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { CometStateMachine } from '../state-machine'

const TEST_YAML = path.join(__dirname, '__test_comet__.yaml')

describe('CometStateMachine', () => {
  beforeEach(() => {
    fs.writeFileSync(TEST_YAML, `workflow: full\nphase: open\narchived: false\n`)
  })
  afterEach(() => { try { fs.unlinkSync(TEST_YAML) } catch {} })

  it('reads state from yaml file', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    const state = await sm.readState()
    expect(state.phase).toBe('open')
    expect(state.workflow).toBe('full')
  })

  it('transitions to valid next phase', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    await sm.transition({ type: 'open-complete' })
    const state = await sm.readState()
    expect(state.phase).toBe('design')
  })

  it('rejects invalid transition', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    await expect(sm.transition({ type: 'verify-pass' })).rejects.toThrow()
  })

  it('performs double-write validation', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    await sm.transition({ type: 'open-complete' })
    const content = fs.readFileSync(TEST_YAML, 'utf-8')
    expect(content).toContain('phase: design')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/comet-engine/__tests__/state-machine.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Implement CometStateMachine**

```typescript
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { CometYamlState, CometPhase } from './types'

type StateEvent =
  | { type: 'open-complete' }
  | { type: 'design-complete' }
  | { type: 'build-complete' }
  | { type: 'verify-pass' }
  | { type: 'verify-fail' }
  | { type: 'archived' }

const TRANSITIONS: Record<CometPhase, Record<string, CometPhase>> = {
  open: { 'open-complete': 'design' },
  design: { 'design-complete': 'build' },
  build: { 'build-complete': 'verify' },
  verify: { 'verify-pass': 'archive', 'verify-fail': 'build' },
  archive: {},
}

export class CometStateMachine {
  constructor(private yamlPath: string) {}

  async readState(): Promise<CometYamlState> {
    const raw = fs.readFileSync(this.yamlPath, 'utf-8')
    return yaml.load(raw) as CometYamlState
  }

  async transition(event: StateEvent): Promise<void> {
    const state = await this.readState()
    const allowed = TRANSITIONS[state.phase]
    const target = allowed[event.type]
    if (!target) {
      throw new Error(`Invalid transition: ${state.phase} -> ${event.type}`)
    }
    state.phase = target as CometPhase
    if (event.type === 'verify-pass') state.verify_result = 'pass'
    if (event.type === 'verify-fail') state.verify_result = 'fail'
    this.writeState(state)
    this.validateWrite(state)
  }

  private writeState(state: CometYamlState): void {
    fs.writeFileSync(this.yamlPath, yaml.dump(state))
  }

  private validateWrite(expected: CometYamlState): void {
    const content = fs.readFileSync(this.yamlPath, 'utf-8')
    const parsed = yaml.load(content) as CometYamlState
    if (parsed.phase !== expected.phase) {
      throw new Error('Double-write validation failed: phase mismatch')
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/comet-engine/__tests__/state-machine.test.ts`
Expected: PASS (all 4 tests green)

If `js-yaml` is not a dependency, add it:
```bash
npm install js-yaml
npm install -D @types/js-yaml
```

- [ ] **Step 5: Commit**

```bash
git add src/comet-engine/state-machine.ts src/comet-engine/__tests__/state-machine.test.ts
git commit -m "feat: implement CometStateMachine with double-write validation"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 4: Implement CometGuardScheduler

**Files:**
- Create: `src/comet-engine/guard-scheduler.ts`
- Create: `src/comet-engine/__tests__/guard-scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { CometGuardScheduler } from '../guard-scheduler'

describe('CometGuardScheduler', () => {
  const scheduler = new CometGuardScheduler()

  it('executes a successful guard script', async () => {
    const result = await scheduler.runGuard('echo', ['hello'], { timeout: 5000 })
    expect(result.success).toBe(true)
  })

  it('fails on non-zero exit code', async () => {
    const result = await scheduler.runGuard('false', [], { timeout: 5000 })
    expect(result.success).toBe(false)
  })

  it('times out on long-running guards', async () => {
    const result = await scheduler.runGuard('sleep', ['10'], { timeout: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toContain('timeout')
  })

  it('resolves script path from COMET_GUARD env', async () => {
    const resolved = scheduler.resolveGuard('$COMET_GUARD')
    expect(resolved).toContain('comet-guard.sh')
    expect(resolved).not.toContain('$')
  })
})
```

- [ ] **Step 2: Implement CometGuardScheduler**

```typescript
import { execFile } from 'child_process'

export interface GuardOptions {
  timeout: number
}

export interface GuardResult {
  success: boolean
  stdout: string
  stderr: string
  error?: string
}

export class CometGuardScheduler {
  async runGuard(
    cmd: string,
    args: string[] = [],
    options: GuardOptions = { timeout: 30000 }
  ): Promise<GuardResult> {
    return new Promise((resolve) => {
      const proc = execFile(cmd, args, { timeout: options.timeout }, (err, stdout, stderr) => {
        if (err && (err as any).killed) {
          resolve({ success: false, stdout, stderr, error: 'timeout' })
        } else if (err) {
          resolve({ success: false, stdout, stderr, error: stderr || err.message })
        } else {
          resolve({ success: true, stdout, stderr })
        }
      })
    })
  }

  resolveGuard(guardSpec: string): string {
    if (guardSpec.startsWith('$')) {
      const envVar = guardSpec.slice(1)
      return process.env[envVar] || guardSpec
    }
    return guardSpec
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/comet-engine/__tests__/guard-scheduler.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/comet-engine/guard-scheduler.ts src/comet-engine/__tests__/guard-scheduler.test.ts
git commit -m "feat: implement CometGuardScheduler with timeout and fallback"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 5: Implement CometOrchestrator

**Files:**
- Create: `src/comet-engine/orchestrator.ts`
- Create: `src/comet-engine/__tests__/orchestrator.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { CometOrchestrator } from '../orchestrator'

const TEST_JSON = path.join(__dirname, '__test_orch__.json')
const TEST_YAML = path.join(__dirname, '__test_comet__.yaml')

const MINIMAL_ORCH = {
  schema: 'comet-orchestration-v1',
  initialPhase: 'open',
  phases: {
    open: {
      label: '开启', description: '', entry: { guards: [], preconditions: [] },
      exit: { guards: [], postconditions: [], transitionTo: 'design' },
      decisionPoints: []
    },
    design: {
      label: '设计', description: '', entry: { guards: [], preconditions: [] },
      exit: { guards: [], postconditions: [], transitionTo: 'build' },
      decisionPoints: []
    }
  },
  presets: {}
}

describe('CometOrchestrator', () => {
  beforeEach(() => {
    fs.writeFileSync(TEST_JSON, JSON.stringify(MINIMAL_ORCH))
    fs.writeFileSync(TEST_YAML, 'workflow: full\nphase: open\narchived: false\n')
  })
  afterEach(() => {
    try { fs.unlinkSync(TEST_JSON) } catch {}
    try { fs.unlinkSync(TEST_YAML) } catch {}
  })

  it('loads orchestration and state on start', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const state = orch.getCurrentState()
    expect(state.phase).toBe('open')
    expect(state.changeName).toBe('test-change')
  })

  it('transitions to next phase when allowed', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    await orch.transition('design')
    expect(orch.getCurrentState().phase).toBe('design')
  })

  it('rejects transition not in orchestration definition', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    await expect(orch.transition('archive')).rejects.toThrow()
  })

  it('notifies listeners on state change', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const changes: any[] = []
    orch.onStateChange((s) => changes.push(s.phase))
    await orch.transition('design')
    expect(changes).toEqual(['design'])
  })
})
```

- [ ] **Step 2: Implement CometOrchestrator**

```typescript
import * as fs from 'fs'
import {
  CometOrchestration,
  CometPhase,
  CometEngineState,
  CometYamlState,
  CometPhaseDecision,
  CometDecisionChoice,
} from './types'
import { CometStateMachine } from './state-machine'
import { CometGuardScheduler } from './guard-scheduler'

export type StateChangeCallback = (state: CometEngineState) => void

export class CometOrchestrator {
  private orchestration: CometOrchestration
  private stateMachine: CometStateMachine
  private guardScheduler = new CometGuardScheduler()
  private listeners: StateChangeCallback[] = []
  private engineState: CometEngineState

  constructor(
    private orchestrationPath: string,
    private yamlPath: string,
    public changeName: string
  ) {
    this.orchestration = JSON.parse(fs.readFileSync(orchestrationPath, 'utf-8'))
    this.stateMachine = new CometStateMachine(yamlPath)
    this.engineState = {
      changeName,
      phase: 'open',
      workflow: 'full',
      phases: {},
      activeDecision: null,
      guardStatus: 'idle',
      guardOutput: null,
    }
  }

  async start(): Promise<void> {
    const yamlState = await this.stateMachine.readState()
    this.engineState.phase = yamlState.phase
    this.engineState.workflow = yamlState.workflow
    this.buildPhaseStatus()
    this.emitChange()
  }

  async transition(targetPhase: string): Promise<void> {
    const current = this.engineState.phase
    const phaseDef = this.orchestration.phases[current as CometPhase]
    if (!phaseDef || phaseDef.exit.transitionTo !== targetPhase) {
      throw new Error(
        `Invalid transition: ${current} -> ${targetPhase}. ` +
        `Allowed: ${phaseDef?.exit.transitionTo || '(none)'}`
      )
    }

    this.engineState.guardStatus = 'running'
    this.emitChange()

    for (const guard of phaseDef.exit.guards) {
      const resolvedCmd = this.guardScheduler.resolveGuard(guard)
      const result = await this.guardScheduler.runGuard(resolvedCmd, [this.changeName])
      if (!result.success) {
        this.engineState.guardStatus = 'failed'
        this.engineState.guardOutput = result.error || result.stderr
        this.emitChange()
        throw new Error(`Guard failed: ${result.error || result.stderr}`)
      }
    }

    this.engineState.guardStatus = 'passed'
    this.engineState.phase = targetPhase as CometPhase
    this.buildPhaseStatus()
    this.emitChange()
  }

  async evaluateDecision(choice: CometDecisionChoice): Promise<void> {
    const phaseDef = this.orchestration.phases[this.engineState.phase]
    if (!phaseDef) return
    const decision = phaseDef.decisionPoints.find((d) => d.id === choice.decisionId)
    if (!decision) return
    const option = decision.options.find((o) => o.label === choice.choice)
    if (!option) return

    if (option.action.startsWith('transition:')) {
      const target = option.action.split(':')[1]
      await this.transition(target)
    } else if (option.action.startsWith('set:')) {
      const parts = option.action.split(',')
      for (const part of parts) {
        const [, kv] = part.split(':')
        const [k, v] = kv.split('=')
        if (k === 'isolation') { /* handled by caller */ }
      }
    }

    this.engineState.activeDecision = null
    this.emitChange()
  }

  getCurrentState(): CometEngineState {
    return { ...this.engineState }
  }

  onStateChange(callback: StateChangeCallback): void {
    this.listeners.push(callback)
  }

  private buildPhaseStatus(): void {
    const phaseOrder: CometPhase[] = ['open', 'design', 'build', 'verify', 'archive']
    let foundActive = false
    for (const phase of phaseOrder) {
      const def = this.orchestration.phases[phase]
      if (!def) continue
      if (!foundActive && phase === this.engineState.phase) {
        this.engineState.phases[phase] = { status: 'active', progress: 50 }
        foundActive = true
      } else if (!foundActive) {
        this.engineState.phases[phase] = { status: 'completed', progress: 100 }
      } else {
        this.engineState.phases[phase] = { status: 'pending', progress: 0 }
      }
    }
  }

  private emitChange(): void {
    for (const cb of this.listeners) cb(this.engineState)
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/comet-engine/__tests__/orchestrator.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/comet-engine/orchestrator.ts src/comet-engine/__tests__/orchestrator.test.ts
git commit -m "feat: implement CometOrchestrator with transition engine"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 6: Integrate slash commands and API

**Files:**
- Modify: `src/slash/index.ts`
- Modify: `src/server/api.ts`
- Modify: `src/server/websocket.ts`

- [ ] **Step 1: Add comet commands to SlashHandler**

In `src/slash/index.ts`, add comet command cases to the switch statement and a `handleComet` method.

**Add to switch statement** (after `case 'stream':` block):
```typescript
case 'comet':
  return { handled: true, reply: await this.handleComet(parts.slice(1), userId) }
```

**Add `handleComet` method** to the `SlashHandler` class:
```typescript
private async handleComet(args: string[], userId: string): Promise<string> {
  const subCommand = args[0]
  if (!subCommand) {
    return 'Comet 工作流命令:\n' +
      '  /comet — 自动检测阶段\n' +
      '  /comet-open — 开启新变更\n' +
      '  /comet-design — 深度设计\n' +
      '  /comet-build — 计划与构建\n' +
      '  /comet-verify — 验证与收尾\n' +
      '  /comet-archive — 归档\n' +
      '  /comet-hotfix — 热修复\n' +
      '  /comet-tweak — 小改动'
  }

  const validCommands = ['open', 'design', 'build', 'verify', 'archive', 'hotfix', 'tweak']
  const command = subCommand.replace(/^comet-/, '')
  if (!validCommands.includes(command)) {
    return `未知 Comet 子命令: ${subCommand}`
  }

  const orchestrator = this.orchestrator as any
  const cometEngine = orchestrator.cometEngine
  if (!cometEngine) {
    return 'Comet 引擎未初始化'
  }

  const state = cometEngine.getCurrentState()
  return `Comet [${state.changeName}] 当前阶段: ${state.phase}\n` +
    `工作流: ${state.workflow}\n` +
    `目标阶段: ${command}\n` +
    `使用 UI 面板进行交互操作。`
}
```

- [ ] **Step 2: Add comet API endpoint**

In `src/server/api.ts`, inside `registerApiRoutes`:
```typescript
// Comet engine status
app.get('/api/comet/status', async () => {
  const engine = (orchestrator as any).cometEngine
  if (!engine) return { engineAvailable: false }
  return { engineAvailable: true, state: engine.getCurrentState() }
})

// Plugin update
app.post('/api/plugins/update', async () => {
  try {
    const { execSync } = await import('child_process')
    const result = execSync('npx openspec update 2>&1 || git pull 2>&1', {
      timeout: 60000,
      cwd: process.cwd(),
    })
    return { success: true, output: result.toString() }
  } catch (err: any) {
    return { success: false, output: err.stderr?.toString() || err.message }
  }
})
```

- [ ] **Step 3: Extend WebSocket message types**

In `src/server/websocket.ts`, add support for `comet-state-update` and `comet-decision` message types.

- [ ] **Step 4: Integrate CometOrchestrator in core.ts**

In `src/orchestrator/core.ts`, in the constructor, initialize the engine:
```typescript
import { CometOrchestrator } from '../comet-engine/orchestrator'

// In constructor, after store initialization:
const orchestrationPath = path.join(process.cwd(), 'comet-orchestration.json')
const yamlPath = path.join(process.cwd(), 'openspec', 'changes', 'comet-workflow-ui', '.comet.yaml')
this.cometEngine = new CometOrchestrator(orchestrationPath, yamlPath, 'comet-workflow-ui')
this.cometEngine.onStateChange((state) => {
  this.broadcast({ type: 'comet-state-update', state })
})
this.cometEngine.start().catch(console.error)
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (fix any type errors)

- [ ] **Step 6: Commit**

```bash
git add src/slash/index.ts src/server/api.ts src/server/websocket.ts src/orchestrator/core.ts
git commit -m "feat: integrate comet engine with slash commands and API"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 7: Right panel — Comet status monitoring

**Files:**
- Modify: `src/webui/src/components/HealthDashboard.tsx`
- Modify: `src/webui/src/App.tsx`
- Modify: `src/webui/src/types.ts`

- [ ] **Step 1: Add engine types to webui types**

In `src/webui/src/types.ts`, add:
```typescript
export type CometPhase = 'open' | 'design' | 'build' | 'verify' | 'archive'
export type CometWorkflow = 'full' | 'hotfix' | 'tweak'

export interface CometPhaseStatus {
  status: 'pending' | 'active' | 'completed'
  progress: number
}

export interface CometEngineState {
  changeName: string
  phase: CometPhase
  workflow: CometWorkflow
  phases: Record<string, CometPhaseStatus>
  activeDecision: { id: string; prompt: string; options: { label: string; action: string }[] } | null
  guardStatus: 'idle' | 'running' | 'passed' | 'failed'
  guardOutput: string | null
}
```

- [ ] **Step 2: Modify HealthDashboard to show comet status + budget one-liner**

Replace the budget bar with a one-liner. Add a `cometState` prop and render comet status section.

Key changes to `HealthDashboard.tsx`:
- Add prop: `cometState?: CometEngineState`
- Budget section: merge into single line like `预算: ¥1.50 / ¥10.00 ████░░░░ 15%`
- New section "Comet" below budget:
  - Show change name, workflow type badge (full/hotfix/tweak), current phase
  - Phase progress bar showing all 5 phases
  - Guard status indicator

- [ ] **Step 3: Wire cometState in App.tsx**

In `App.tsx`:
- Add `cometState` state variable
- On WebSocket `comet-state-update`, update cometState
- On page load, `GET /api/comet/status` as fallback
- Pass cometState to HealthDashboard

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/webui/src/components/HealthDashboard.tsx src/webui/src/App.tsx src/webui/src/types.ts
git commit -m "feat: right panel shows comet status with one-line budget"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 8: Left panel — Phase list view

**Files:**
- Modify: `src/webui/src/components/TreeView.tsx`
- Modify: `src/webui/src/App.tsx`

- [ ] **Step 1: Add phase mode to TreeView**

Add a `mode` prop: `'tasks' | 'phases'`
When `mode === 'phases'`, render the 5 Comet phases vertically instead of task tree.

Each phase card shows:
- Phase name and icon
- Status indicator (active/completed/pending with colors)
- Progress bar
- Click handler that selects the phase

Add support for `cometState` prop to drive phase data.

- [ ] **Step 2: Wire in App.tsx**

Pass `mode="phases"` and `cometState` to TreeView when in comet workflow view.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/webui/src/components/TreeView.tsx src/webui/src/App.tsx
git commit -m "feat: left panel shows comet phase list view"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 9: Center console — Decision cards

**Files:**
- Modify: `src/webui/src/components/StreamConsole.tsx`
- Modify: `src/webui/src/App.tsx`

- [ ] **Step 1: Add DecisionCard sub-component to StreamConsole**

```typescript
interface DecisionCardProps {
  decision: {
    id: string
    prompt: string
    options: { label: string; action: string }[]
  }
  onSelect: (decisionId: string, choice: string) => void
}

function DecisionCard({ decision, onSelect }: DecisionCardProps) {
  return (
    <div style={{
      background: '#1c2333',
      border: '1px solid #58a6ff',
      borderRadius: 8, padding: 16, margin: '12px 0'
    }}>
      <div style={{ color: '#58a6ff', fontWeight: 'bold', marginBottom: 12 }}>
        ⚡ {decision.prompt}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {decision.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSelect(decision.id, opt.label)}
            style={{
              background: '#238636', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

Render `<DecisionCard>` at the top of StreamConsole when `activeDecision` is not null.

- [ ] **Step 2: Wire decision sending in App.tsx**

Add `handleCometDecision` that sends `{type: 'comet-decision', decisionId, choice}` via WebSocket.
Pass it to StreamConsole as `onCometDecision` prop.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/webui/src/components/StreamConsole.tsx src/webui/src/App.tsx
git commit -m "feat: center console shows decision cards for comet workflow"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 10: Settings "Update Plugins" button

**Files:**
- Modify: `src/webui/src/components/SettingsPage.tsx`

- [ ] **Step 1: Add Update Plugins button to SettingsPage**

In the Config tab, add a section:
```typescript
const [pluginUpdating, setPluginUpdating] = useState(false)
const [pluginResult, setPluginResult] = useState<string | null>(null)

const handlePluginUpdate = async () => {
  setPluginUpdating(true)
  setPluginResult(null)
  try {
    const res = await fetch('/api/plugins/update', { method: 'POST' })
    const data = await res.json()
    setPluginResult(data.success ? '✅ 更新成功' : `❌ 更新失败: ${data.output}`)
  } catch (err: any) {
    setPluginResult(`❌ 请求失败: ${err.message}`)
  } finally {
    setPluginUpdating(false)
  }
}
```

Render:
```
<div style={{ borderTop: '1px solid #30363d', paddingTop: 16, marginTop: 16 }}>
  <h3 style={{ margin: '0 0 8px' }}>插件管理</h3>
  <button onClick={handlePluginUpdate} disabled={pluginUpdating}
    style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
    {pluginUpdating ? '更新中...' : '更新插件'}
  </button>
  {pluginResult && <p style={{ marginTop: 8, color: '#8b949e' }}>{pluginResult}</p>}
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/webui/src/components/SettingsPage.tsx
git commit -m "feat: add Update Plugins button to Settings page"
```

archived-with: 2026-06-03-comet-workflow-ui
---

### Task 11: Full build and test verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS (0 errors)

- [ ] **Step 2: Run unit tests**

Run: `npm run test`
Expected: PASS (existing tests + new comet-engine tests)

- [ ] **Step 3: Run full build**

Run: `npm run build`
Expected: PASS (tsc + vite build)

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: verify build and tests pass"
```
