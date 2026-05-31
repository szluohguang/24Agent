import type { AgentState, HealthStatus } from './types.js'
import { Logger } from './logger.js'

const logger = Logger.getInstance()

export type HealthCheckFn = (sessionId: string) => Promise<boolean>

export interface HealthMonitorCallbacks {
  onSessionHung: (sessionId: string) => void
  onSseStale: () => void
}

/**
 * HealthMonitor — 会话健康监控。
 * 两层检测：
 * 1. 心跳（heartbeat）：定期检查 Agent 是否存活
 * 2. 看门狗（watchdog）：单次会话的静默超时检测
 * 3. SSE 看门狗：检测全局 SSE 事件流是否中断
 */
export class HealthMonitor {
  private agents: Map<string, AgentState> = new Map()
  private healthCheckFn: HealthCheckFn
  private callbacks: HealthMonitorCallbacks
  private heartbeatInterval: number
  private watchdogTimeout: number
  private sseWatchdogTimeout: number
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private watchdogTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private sseWatchdogTimer: ReturnType<typeof setTimeout> | null = null
  private lastSseEvent: number = Date.now()

  constructor(
    callbacks: HealthMonitorCallbacks,
    healthCheckFn: HealthCheckFn,
    options?: {
      heartbeatInterval?: number
      watchdogTimeout?: number
      sseWatchdogTimeout?: number
    },
  ) {
    this.callbacks = callbacks
    this.healthCheckFn = healthCheckFn
    this.heartbeatInterval = options?.heartbeatInterval ?? 30000
    this.watchdogTimeout = options?.watchdogTimeout ?? 120000
    this.sseWatchdogTimeout = options?.sseWatchdogTimeout ?? 60000
  }

  registerSession(sessionId: string, agentState: AgentState): void {
    this.agents.set(sessionId, agentState)
    this.resetWatchdog(sessionId)
  }

  unregisterSession(sessionId: string): void {
    this.agents.delete(sessionId)
    this.clearWatchdog(sessionId)
  }

  onSseEvent(): void {
    this.lastSseEvent = Date.now()
  }

  notifySessionEvent(sessionId: string): void {
    const agent = this.agents.get(sessionId)
    if (agent) {
      agent.healthStatus = 'healthy'
      agent.lastHeartbeat = Date.now()
      this.resetWatchdog(sessionId)
    }
  }

  start(): void {
    this.heartbeatTimer = setInterval(() => this.runHeartbeat(), this.heartbeatInterval)
    this.startSseWatchdog()
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.sseWatchdogTimer) clearTimeout(this.sseWatchdogTimer)
    for (const timer of this.watchdogTimers.values()) clearTimeout(timer)
    this.watchdogTimers.clear()
  }

  getActiveSessions(): string[] {
    return Array.from(this.agents.keys())
  }

  getAgentState(sessionId: string): AgentState | undefined {
    return this.agents.get(sessionId)
  }

  private async runHeartbeat(): Promise<void> {
    for (const [sessionId, agent] of this.agents.entries()) {
      try {
        const healthy = await this.healthCheckFn(sessionId)
        if (healthy) {
          agent.healthStatus = 'healthy'
          agent.lastHeartbeat = Date.now()
        } else {
          this.handleFailedHeartbeat(sessionId, agent)
        }
      } catch {
        this.handleFailedHeartbeat(sessionId, agent)
      }
    }
  }

  private handleFailedHeartbeat(sessionId: string, agent: AgentState): void {
    if (agent.healthStatus === 'healthy' || agent.healthStatus === 'suspected') {
      agent.healthStatus = 'suspected'
      setTimeout(async () => {
        try {
          const healthy = await this.healthCheckFn(sessionId)
          if (!healthy) {
            agent.healthStatus = 'hung'
            this.callbacks.onSessionHung(sessionId)
          }
        } catch {
          agent.healthStatus = 'hung'
          this.callbacks.onSessionHung(sessionId)
        }
      }, 10000)
    }
  }

  private resetWatchdog(sessionId: string): void {
    this.clearWatchdog(sessionId)
    const timer = setTimeout(() => {
      const agent = this.agents.get(sessionId)
      if (agent) {
        agent.healthStatus = 'hung'
        this.callbacks.onSessionHung(sessionId)
      }
    }, this.watchdogTimeout)
    this.watchdogTimers.set(sessionId, timer)
  }

  private clearWatchdog(sessionId: string): void {
    const timer = this.watchdogTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.watchdogTimers.delete(sessionId)
    }
  }

  private startSseWatchdog(): void {
    const check = () => {
      const elapsed = Date.now() - this.lastSseEvent
      if (elapsed >= this.sseWatchdogTimeout) {
        this.callbacks.onSseStale()
      }
      this.sseWatchdogTimer = setTimeout(check, this.sseWatchdogTimeout)
    }
    this.sseWatchdogTimer = setTimeout(check, this.sseWatchdogTimeout)
  }
}
