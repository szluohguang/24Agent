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
