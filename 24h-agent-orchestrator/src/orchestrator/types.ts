/** 任务生命周期状态 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

/** 单个任务的完整状态：用于 DAG 调度和结果追踪 */
export interface TaskState {
  id: string
  description: string
  status: TaskStatus
  dependsOn: string[]       // 前置任务 ID 列表
  sessionId?: string        // 对应的 ACP 会话 ID
  retryCount: number
  maxRetries: number
  error?: string
  createdAt: number
  updatedAt: number
  priority: number          // 越小越优先，manual=0 > scheduled=1
  permission: PermissionLevel
  budget: number
}

/** Agent 健康状态 */
export type HealthStatus = 'healthy' | 'suspected' | 'hung' | 'dead'

/** 子 Agent 运行时状态：用于 SSE 流缓冲和监控 */
export interface AgentState {
  sessionId: string
  taskId: string
  status: 'creating' | 'running' | 'idle' | 'error'
  stream: string[]           // SSE text delta 缓冲区
  startTime: number
  model?: string
  provider?: string
  lastHeartbeat: number
  watchdogTimeout: number
  healthStatus: HealthStatus
}

/** 任务完成后的评估结果 */
export interface TaskResult {
  summary: string
  artifacts: string[]        // 变更/创建的文件列表
  cost: number
  tokens?: { input: number; output: number }
}

/** 时间线条目：记录所有重要事件用于 WebUI 展示 */
export interface TimelineEntry {
  id: string
  time: number
  source: 'main' | 'sub' | 'system' | 'user'
  sessionId?: string
  type: string
  message: string
}

export interface WorkspaceState {
  tasks: Map<string, TaskState>
  running: Map<string, AgentState>
  timeline: TimelineEntry[]
  budget: { spent: number; limit: number }
  permissionLevel: PermissionLevel
}

/** 三档权限级别：trusted(全自动) / safe(危险操作拦截) / strict(全审批) */
export type PermissionLevel = 'trusted' | 'safe' | 'strict'

/** 定时任务定义 */
export interface ScheduledTask {
  id: string
  description: string
  cronExpr: string
  permission: PermissionLevel
  budget: number
  maxRetries: number
  enabled: boolean
  lastTriggered: number
}
