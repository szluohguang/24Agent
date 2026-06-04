// Re-export all Comet types with Eagle aliases
export {
  CometPhase as EaglePhase,
  CometWorkflow as EagleWorkflow,
  BuildMode as EagleBuildMode,
  Isolation as EagleIsolation,
  VerifyResult as EagleVerifyResult,
  BranchStatus as EagleBranchStatus,
  CometPhaseDecision as EaglePhaseDecision,
  CometDecisionOption as EagleDecisionOption,
  CometPhaseDefinition as EaglePhaseDefinition,
  CometOrchestration as EagleOrchestration,
  CometPreset as EaglePreset,
  CometUpgradeRule as EagleUpgradeRule,
  CometYamlState as EagleYamlState,
  CometEngineState as EagleEngineState,
  CometDecisionChoice as EagleDecisionChoice,
} from '../comet-engine/types'

export type {
  CometPhase, CometWorkflow, BuildMode, Isolation, VerifyResult, BranchStatus,
  CometPhaseDecision, CometDecisionOption, CometPhaseDefinition,
  CometOrchestration, CometPreset, CometUpgradeRule,
  CometYamlState, CometEngineState, CometDecisionChoice,
} from '../comet-engine/types'

export type EaglePhaseStatus = {
  status: 'pending' | 'active' | 'completed'
  progress: number
}
