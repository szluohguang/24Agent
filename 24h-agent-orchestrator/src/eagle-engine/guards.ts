import * as fs from 'fs'
import * as path from 'path'
import type { CometPhase, CometYamlState } from './types'

export interface EagleGuardResult {
  success: boolean
  message?: string
}

export interface EagleGuardContext {
  changeName: string
  changeDir: string
  yamlState: CometYamlState
}

/**
 * 代码门禁 — 替代 bash 脚本的纯 TypeScript 校验
 *
 * 每个阶段有一个 exit guard，校验通过后才能 transition 到下一阶段。
 * 所有校验在内存中完成，不产生 shell 调用。
 */
export class EagleGuards {
  private readonly CHANGE_DIR: string

  constructor(private baseDir: string) {
    this.CHANGE_DIR = path.join(baseDir, 'openspec', 'changes')
  }

  private changePath(name: string): string {
    return path.join(this.CHANGE_DIR, name)
  }

  private archivePath(name: string): string {
    return path.join(this.CHANGE_DIR, 'archive', name)
  }

  /**
   * open 阶段退出门禁
   * 校验 proposal.md、design.md、tasks.md 存在且非空
   */
  async checkOpenExit(ctx: EagleGuardContext): Promise<EagleGuardResult> {
    const dir = this.changePath(ctx.changeName)
    if (!fs.existsSync(dir)) {
      return { success: false, message: `Change directory not found: ${dir}` }
    }

    const files = [
      { name: 'proposal.md', path: path.join(dir, 'proposal.md') },
      { name: 'design.md', path: path.join(dir, 'design.md') },
      { name: 'tasks.md', path: path.join(dir, 'tasks.md') },
    ]

    for (const f of files) {
      if (!fs.existsSync(f.path)) {
        return { success: false, message: `${f.name} is missing at ${f.path}` }
      }
      const content = fs.readFileSync(f.path, 'utf-8').trim()
      if (!content) {
        return { success: false, message: `${f.name} is empty at ${f.path}` }
      }
    }

    return { success: true }
  }

  /**
   * design 阶段退出门禁
   * 校验 Design Doc 存在、handoff context 完整
   */
  async checkDesignExit(ctx: EagleGuardContext): Promise<EagleGuardResult> {
    const dir = this.changePath(ctx.changeName)

    // Design Doc 路径由 yamlState 指定，检查存在
    if (ctx.yamlState.design_doc) {
      const docPath = path.resolve(this.baseDir, ctx.yamlState.design_doc)
      if (!fs.existsSync(docPath)) {
        return { success: false, message: `Design Doc not found: ${docPath}` }
      }
      const content = fs.readFileSync(docPath, 'utf-8').trim()
      if (!content) {
        return { success: false, message: `Design Doc is empty: ${docPath}` }
      }
      // 检查 frontmatter
      if (!content.startsWith('---')) {
        return { success: false, message: `Design Doc missing frontmatter (must start with '---'): ${docPath}` }
      }
    }

    // Handoff context
    const handoffDir = path.join(dir, '.comet', 'handoff')
    if (ctx.yamlState.handoff_context || fs.existsSync(path.join(handoffDir, 'design-context.md'))) {
      const mdPath = path.join(handoffDir, 'design-context.md')
      const jsonPath = path.join(handoffDir, 'design-context.json')
      if (!fs.existsSync(mdPath) || !fs.existsSync(jsonPath)) {
        return { success: false, message: `Handoff context incomplete, expected: ${mdPath} and ${jsonPath}` }
      }
      // 校验 hash 一致性
      if (ctx.yamlState.handoff_hash) {
        const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
        const crypto = await import('crypto')
        const computedHash = crypto.createHash('sha256').update(JSON.stringify(jsonContent)).digest('hex')
        if (computedHash !== ctx.yamlState.handoff_hash) {
          return { success: false, message: `Handoff context hash mismatch: expected=${ctx.yamlState.handoff_hash}, computed=${computedHash}` }
        }
      }
    }

    return { success: true }
  }

  /**
   * build 阶段退出门禁
   * 校验 isolation/mode 已设置、tasks 全部完成
   */
  async checkBuildExit(ctx: EagleGuardContext): Promise<EagleGuardResult> {
    const dir = this.changePath(ctx.changeName)

    // isolation 和 build_mode 必须已选择
    if (!ctx.yamlState.isolation) {
      return { success: false, message: `isolation not set. Must choose 'branch' or 'worktree' before leaving build.` }
    }
    if (!ctx.yamlState.build_mode) {
      return { success: false, message: `build_mode not set. Must choose execution mode before leaving build.` }
    }

    // tasks.md 必须存在且全部完成
    const tasksPath = path.join(dir, 'tasks.md')
    if (!fs.existsSync(tasksPath)) {
      return { success: false, message: `tasks.md is missing at ${tasksPath}` }
    }
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8')
    const taskLines = tasksContent.split('\n').filter(l => l.startsWith('- ['))
    const completedTasks = taskLines.filter(l => l.startsWith('- [x]'))
    const pendingTasks = taskLines.filter(l => l.startsWith('- [ ]'))
    if (pendingTasks.length > 0) {
      return { success: false, message: `${pendingTasks.length} task(s) not completed: ${pendingTasks.map(t => t.replace('- [ ]', '')).join(', ')}` }
    }
    if (completedTasks.length === 0) {
      return { success: false, message: `tasks.md has no completed tasks.` }
    }

    return { success: true }
  }

  /**
   * verify 阶段退出门禁
   * 校验验证报告存在、分支已处理
   */
  async checkVerifyExit(ctx: EagleGuardContext): Promise<EagleGuardResult> {
    // verify_result 必须已设置
    if (ctx.yamlState.verify_result === 'pending') {
      return { success: false, message: `verify_result is still 'pending'. Complete verification first.` }
    }

    // 验证报告必须存在
    if (ctx.yamlState.verification_report) {
      const reportPath = path.resolve(this.baseDir, ctx.yamlState.verification_report)
      if (!fs.existsSync(reportPath)) {
        return { success: false, message: `Verification report not found: ${reportPath}` }
      }
    } else {
      return { success: false, message: `verification_report not set. Generate verification report first.` }
    }

    // 分支必须已处理
    if (ctx.yamlState.branch_status !== 'handled') {
      return { success: false, message: `branch_status is '${ctx.yamlState.branch_status}'. Handle branch before leaving verify.` }
    }

    return { success: true }
  }

  /**
   * 执行指定阶段的退出门禁
   */
  async checkExit(phase: CometPhase, ctx: EagleGuardContext): Promise<EagleGuardResult> {
    switch (phase) {
      case 'open':
        return this.checkOpenExit(ctx)
      case 'design':
        return this.checkDesignExit(ctx)
      case 'build':
        return this.checkBuildExit(ctx)
      case 'verify':
        return this.checkVerifyExit(ctx)
      case 'archive':
        return { success: true }  // archive has no exit guard
    }
  }
}
