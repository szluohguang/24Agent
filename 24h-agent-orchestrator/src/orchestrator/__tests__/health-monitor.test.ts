import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HealthMonitor, type HealthCheckFn } from '../health-monitor.js'
import type { AgentState } from '../types.js'
import type { HealthMonitorCallbacks } from '../health-monitor.js'

function createAgentState(overrides?: Partial<AgentState>): AgentState {
  return {
    sessionId: 'test-session',
    taskId: 'task-1',
    status: 'running',
    stream: [],
    startTime: Date.now(),
    lastHeartbeat: Date.now(),
    watchdogTimeout: 120000,
    healthStatus: 'healthy',
    ...overrides,
  }
}

describe('HealthMonitor', () => {
  let callbacks: HealthMonitorCallbacks
  let healthCheckFn: HealthCheckFn

  beforeEach(() => {
    vi.useFakeTimers()
    callbacks = {
      onSessionHung: vi.fn() as unknown as (sessionId: string) => void,
      onSseStale: vi.fn() as unknown as () => void,
    }
    healthCheckFn = vi.fn().mockResolvedValue(true) as unknown as HealthCheckFn
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('register and unregister sessions', () => {
    it('should register a session and return it via getActiveSessions', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn)
      const state = createAgentState({ sessionId: 's1' })

      monitor.registerSession('s1', state)

      expect(monitor.getActiveSessions()).toEqual(['s1'])
      expect(monitor.getAgentState('s1')).toBe(state)
    })

    it('should register multiple sessions', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn)
      monitor.registerSession('s1', createAgentState({ sessionId: 's1' }))
      monitor.registerSession('s2', createAgentState({ sessionId: 's2' }))
      expect(monitor.getActiveSessions()).toEqual(['s1', 's2'])
    })

    it('should unregister a session', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn)
      monitor.registerSession('s1', createAgentState({ sessionId: 's1' }))
      monitor.unregisterSession('s1')
      expect(monitor.getActiveSessions()).toEqual([])
    })

    it('should clear watchdog when unregistering', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn)
      monitor.registerSession('s1', createAgentState({ sessionId: 's1' }))
      monitor.unregisterSession('s1')
      vi.advanceTimersByTime(300000)
      expect(callbacks.onSessionHung).not.toHaveBeenCalled()
    })
  })

  describe('heartbeat', () => {
    it('healthy check updates lastHeartbeat', async () => {
      vi.useRealTimers()
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { heartbeatInterval: 50 })
      const state = createAgentState({ sessionId: 's1', lastHeartbeat: 0 })
      monitor.registerSession('s1', state)

      monitor.start()
      await new Promise((r) => setTimeout(r, 100))
      expect(state.lastHeartbeat).toBeGreaterThan(0)
      monitor.stop()
    })

    it('first failure marks suspected, retry after 10s marks hung', { timeout: 30000 }, async () => {
      vi.useRealTimers()
      const failingCheck = vi.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail')) as unknown as HealthCheckFn

      const monitor = new HealthMonitor(
        callbacks, failingCheck,
        { heartbeatInterval: 50, watchdogTimeout: 30000 },
      )
      const state = createAgentState({ sessionId: 's1' })
      monitor.registerSession('s1', state)
      monitor.start()

      await new Promise((r) => setTimeout(r, 150))
      expect(state.healthStatus).toBe('suspected')
      // wait for the 10s retry + 50ms heartbeat to confirm hung
      await new Promise((r) => setTimeout(r, 11000))
      expect(state.healthStatus).toBe('hung')
      monitor.stop()
    })

    it('returns to healthy after first failure if next heartbeat succeeds', async () => {
      vi.useRealTimers()
      const varyingCheck = vi.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(true) as unknown as HealthCheckFn

      const monitor = new HealthMonitor(callbacks, varyingCheck, { heartbeatInterval: 50 })
      const state = createAgentState({ sessionId: 's1' })
      monitor.registerSession('s1', state)
      monitor.start()

      await new Promise((r) => setTimeout(r, 200))
      expect(state.healthStatus).toBe('healthy')
      monitor.stop()
    })

    it('stays hung after confirmed hung', { timeout: 30000 }, async () => {
      vi.useRealTimers()
      const alwaysFailing = vi.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValue(new Error('fail')) as unknown as HealthCheckFn

      const monitor = new HealthMonitor(
        callbacks, alwaysFailing,
        { heartbeatInterval: 50, watchdogTimeout: 30000 },
      )
      const state = createAgentState({ sessionId: 's1' })
      monitor.registerSession('s1', state)
      monitor.start()

      await new Promise((r) => setTimeout(r, 150))
      expect(state.healthStatus).toBe('suspected')
      await new Promise((r) => setTimeout(r, 11000))
      expect(state.healthStatus).toBe('hung')
      monitor.stop()
    })
  })

  describe('session watchdog', () => {
    it('fires onSessionHung after watchdog timeout', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { watchdogTimeout: 5000 })
      const state = createAgentState({ sessionId: 's1', watchdogTimeout: 5000 })
      monitor.registerSession('s1', state)

      vi.advanceTimersByTime(5000)
      expect(state.healthStatus).toBe('hung')
      expect(callbacks.onSessionHung).toHaveBeenCalledWith('s1')
    })

    it('notifySessionEvent resets watchdog and restores healthy', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { watchdogTimeout: 5000 })
      const state = createAgentState({ sessionId: 's1', watchdogTimeout: 5000 })
      monitor.registerSession('s1', state)

      vi.advanceTimersByTime(3000)
      monitor.notifySessionEvent('s1')

      vi.advanceTimersByTime(3000)
      expect(state.healthStatus).toBe('healthy')
      expect(callbacks.onSessionHung).not.toHaveBeenCalled()

      vi.advanceTimersByTime(5000)
      expect(state.healthStatus).toBe('hung')
      expect(callbacks.onSessionHung).toHaveBeenCalled()
    })

    it('does not fire for unknown sessions', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { watchdogTimeout: 5000 })
      monitor.notifySessionEvent('unknown-session')

      vi.advanceTimersByTime(5000)
      expect(callbacks.onSessionHung).not.toHaveBeenCalled()
    })

    it('handles multiple sessions independently', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { watchdogTimeout: 5000 })

      const s1 = createAgentState({ sessionId: 's1', watchdogTimeout: 5000 })
      const s2 = createAgentState({ sessionId: 's2', watchdogTimeout: 5000 })
      monitor.registerSession('s1', s1)
      monitor.registerSession('s2', s2)

      vi.advanceTimersByTime(2500)
      monitor.notifySessionEvent('s1')
      vi.advanceTimersByTime(2500)

      expect(s2.healthStatus).toBe('hung')
      expect(callbacks.onSessionHung).toHaveBeenCalledWith('s2')
    })
  })

  describe('SSE watchdog', () => {
    it('fires onSseStale after timeout without events', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { sseWatchdogTimeout: 10000 })
      monitor.start()

      vi.advanceTimersByTime(10000)
      expect(callbacks.onSseStale).toHaveBeenCalled()

      monitor.stop()
    })

    it('onSseEvent postpones the stale detection', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { sseWatchdogTimeout: 10000 })
      monitor.start()

      vi.advanceTimersByTime(9000)
      monitor.onSseEvent()
      vi.advanceTimersByTime(9000)
      expect(callbacks.onSseStale).not.toHaveBeenCalled()

      vi.advanceTimersByTime(10000)
      expect(callbacks.onSseStale).toHaveBeenCalled()

      monitor.stop()
    })
  })

  describe('lifecycle', () => {
    it('no activity before start()', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { sseWatchdogTimeout: 10000 })
      vi.advanceTimersByTime(10000)
      expect(callbacks.onSseStale).not.toHaveBeenCalled()
    })

    it('stop() clears all timers', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn, { sseWatchdogTimeout: 10000 })
      monitor.start()
      monitor.stop()

      vi.advanceTimersByTime(100000)
      expect(callbacks.onSseStale).not.toHaveBeenCalled()
    })
  })

  describe('getActiveSessions and getAgentState', () => {
    it('returns empty array when no sessions', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn)
      expect(monitor.getActiveSessions()).toEqual([])
      expect(monitor.getAgentState('anything')).toBeUndefined()
    })

    it('returns correct agent state after registration', () => {
      const monitor = new HealthMonitor(callbacks, healthCheckFn)
      const state = createAgentState({ sessionId: 's1' })
      monitor.registerSession('s1', state)
      expect(monitor.getAgentState('s1')).toBe(state)
      expect(monitor.getAgentState('s1')?.healthStatus).toBe('healthy')
    })
  })
})
