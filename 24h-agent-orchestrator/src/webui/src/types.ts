export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'scheduled' | 'queued' | 'retrying' | 'awaiting_review' | 'rejected'

export interface TaskResult {
  summary: string
  artifacts: string[]
  cost: number
  tokens?: { input: number; output: number }
}

export interface ReviewRecord {
  taskId: string
  action: 'approved' | 'rejected'
  feedback?: string
  reviewer: 'user' | 'system'
  reviewedAt: number
}

export interface TaskNode {
  id: string
  description: string
  status: TaskStatus
  sessionId?: string
  dependsOn: string[]
  retryCount?: number
  maxRetries?: number
  result?: TaskResult
  reviewHistory?: ReviewRecord[]
}

export interface TimelineEntryData {
  id: string
  time: number
  source: 'main' | 'sub' | 'system' | 'user'
  sessionId?: string
  type: string
  message: string
}

export type PermissionLevel = 'trusted' | 'safe' | 'strict'

export interface ScheduleItem {
  id: string
  description: string
  cronExpr: string
  permission: PermissionLevel
  budget: number
  maxRetries: number
  enabled: boolean
  lastTriggered: number
}

export type CometPhase = 'open' | 'design' | 'build' | 'verify' | 'archive'
export type CometWorkflow = 'full' | 'hotfix' | 'tweak'

export interface CometPhaseStatus {
  status: 'pending' | 'active' | 'completed'
  progress: number
}

export interface SystemLogEntry {
  id: string
  time: number
  type: 'info' | 'warning' | 'error'
  message: string
  source: string
  count?: number
  acknowledged?: boolean
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
