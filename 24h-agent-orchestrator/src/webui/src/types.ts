export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'scheduled' | 'queued' | 'retrying'

export interface TaskNode {
  id: string
  description: string
  status: TaskStatus
  sessionId?: string
  dependsOn: string[]
  retryCount?: number
  maxRetries?: number
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
