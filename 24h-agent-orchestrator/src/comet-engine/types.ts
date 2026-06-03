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
