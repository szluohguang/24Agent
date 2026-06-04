/**
 * GuardScheduler — 门禁调度器
 *
 * 当前调度器使用 EagleGuards (TypeScript) 替代 shell 脚本执行。
 * 保留此接口以兼容原有调用模式。
 */
import { EagleGuards, EagleGuardContext, EagleGuardResult } from './guards'
import type { CometPhase } from './types'

export class EagleGuardScheduler {
  private codeGuards: EagleGuards

  constructor(baseDir?: string) {
    this.codeGuards = new EagleGuards(baseDir || process.cwd())
  }

  /**
   * 执行代码门禁检查
   */
  async runGuard(phase: CometPhase, ctx: EagleGuardContext): Promise<EagleGuardResult> {
    return this.codeGuards.checkExit(phase, ctx)
  }

  /**
   * 保留环境变量解析（兼容旧接口，实际不再需要）
   */
  resolveGuard(guardSpec: string): string {
    if (guardSpec.startsWith('$')) {
      const envVar = guardSpec.slice(1)
      return process.env[envVar] || guardSpec
    }
    return guardSpec
  }
}
