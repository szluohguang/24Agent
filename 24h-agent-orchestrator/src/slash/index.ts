import type { Orchestrator } from '../orchestrator/core.js'
import type { TaskState } from '../orchestrator/types.js'

export class SlashHandler {
  private orchestrator: Orchestrator
  private selectedTask: Map<string, string> = new Map()

  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator
  }

  async execute(input: string, userId = 'default'): Promise<{ handled: boolean; reply: string }> {
    const trimmed = input.trim()
    if (!trimmed.startsWith('/')) {
      return { handled: false, reply: '' }
    }

    const parts = trimmed.slice(1).split(' ').filter(Boolean)
    if (parts.length === 0) return { handled: true, reply: this.help() }

    const command = parts[0]!.toLowerCase()

    try {
      switch (command) {
        case 'help':
          return { handled: true, reply: this.help() }

        // ── Task commands ──
        case 'task': {
          return { handled: true, reply: await this.handleTask(parts.slice(1), userId) }
        }

        // ── Project commands ──
        case 'project': {
          return { handled: true, reply: await this.handleProject(parts.slice(1)) }
        }

        // ── Stream commands ──
        case 'stream': {
          const arg = parts[1]?.toLowerCase()
          const levelNames: Record<string, string> = {
            off: '关闭，仅在任务完成时发送结果',
            thinking: '思考过程',
            full: '全部步骤',
          }

          if (!arg) {
            const current = this.orchestrator.getStore().getConfig('wechat_stream_level') || 'thinking'
            return {
              handled: true,
              reply: `📊 当前流式推送级别：**${levelNames[current] || current}**\n\n用法：/stream <off|thinking|full>\n\n- off: 关闭，仅在任务完成时发送结果\n- thinking: 推送思考过程和工具调用\n- full: 推送所有步骤的详细信息`,
            }
          }

          if (!['off', 'thinking', 'full'].includes(arg)) {
            return {
              handled: true,
              reply: `❌ 无效参数: ${arg}\n用法：/stream <off|thinking|full>`,
            }
          }

          this.orchestrator.getStore().setConfig('wechat_stream_level', arg)
          return {
            handled: true,
            reply: `✅ 流式推送级别已设为：**${levelNames[arg]}**`,
          }
        }

        case 'comet':
          return { handled: true, reply: await this.handleComet(parts.slice(1)) }

        default:
          return { handled: true, reply: `未知命令: /${command}\n\n${this.help()}` }
      }
    } catch (err) {
      return { handled: true, reply: `错误: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  private help(): string {
    return [
      '**可用命令**',
      '━━━━━━━━━━━━━━━━',
      '',
      '📋 **任务管理**',
      '  `/task create <描述>` - 创建新任务',
      '  `/task list` - 列出所有任务',
      '  `/task select <id>` - 选择任务以便追问',
      '  `/task ask <问题>` - 对当前选中的任务追问',
      '  `/task status <id> <状态>` - 更新任务状态 (pending/completed/cancelled)',
      '',
      '📁 **项目管理**',
      '  `/project goal` - 查看项目目标',
      '  `/project goal set <文本>` - 设置项目目标',
      '  `/project desc` - 查看项目描述',
      '  `/project desc set <文本>` - 设置项目描述',
      '  `/project progress` - 查看项目进度',
      '',
      '🚀 **Comet 工作流**',
      '  `/comet <sub>` - Comet 工作流控制 (open/design/build/verify/archive/hotfix/tweak)',
      '',
      '❓ **其他**',
      '  `/help` - 显示此帮助',
      '  `/stream [off|thinking|full]` - 查看/设置流式推送级别',
    ].join('\n')
  }

  private async handleTask(args: string[], userId: string): Promise<string> {
    if (args.length === 0) {
      return '用法:\n  `/task create <描述>`  `/task list`  `/task select <id>`  `/task ask <问题>`\n  `/task status <id> pending|completed|cancelled`'
    }

    const sub = args[0]!.toLowerCase()

    switch (sub) {
      case 'create': {
        const desc = args.slice(1).join(' ')
        if (!desc) return '请提供任务描述: `/task create <描述>`'
        const taskId = this.orchestrator.addTask(desc)
        this.selectedTask.set(userId, taskId)
        return `✅ 任务已创建: **#${taskId}**\n   ${desc}\n\n调度器会自动分发执行。`
      }

      case 'list': {
        const state = this.orchestrator.getState()
        const tasks = state.tasks
        if (tasks.length === 0) return '📋 暂无任务。使用 `/task create <描述>` 创建。'

        const selectedId = this.selectedTask.get(userId)
        const statusIcon: Record<string, string> = {
          pending: '⏳', running: '🔄', completed: '✅',
          failed: '❌', awaiting_review: '🔍', rejected: '🚫',
        }
        const statusLabel: Record<string, string> = {
          pending: '等待中', running: '运行中', completed: '已完成',
          failed: '失败', awaiting_review: '待审核', rejected: '已驳回',
        }

        const lines: string[] = ['📋 **任务列表**', '━━━━━━━━━━━━━━━━']
        for (const task of tasks) {
          const icon = statusIcon[task.status] ?? '📌'
          const selected = task.id === selectedId ? ' ← **已选中**' : ''
          const shortDesc = task.description.length > 50
            ? task.description.slice(0, 50) + '...'
            : task.description
          const label = statusLabel[task.status] ?? task.status
          lines.push(`  ${icon} **${task.id}**${selected}`)
          lines.push(`     ${shortDesc} [${label}]`)
        }
        lines.push('', `━━━━━━━━━━━━━━━━\n共 ${tasks.length} 个任务`)
        return lines.join('\n')
      }

      case 'select': {
        const id = args[1]
        if (!id) return '请提供任务 ID: `/task select <id>`'
        const state = this.orchestrator.getState()
        const task = state.tasks.find((t: TaskState) => t.id === id)
        if (!task) return `未找到任务: ${id}`
        this.selectedTask.set(userId, id)
        return `✅ 已选中任务 **${id}**: ${task.description}`
      }

      case 'ask': {
        const question = args.slice(1).join(' ')
        if (!question) return '请提供问题: `/task ask <问题>`'
        const selectedId = this.selectedTask.get(userId)
        if (!selectedId) return '未选中任何任务。先用 `/task select <id>` 选择。'

        const state = this.orchestrator.getState()
        const task = state.tasks.find((t: TaskState) => t.id === selectedId)
        if (!task) {
          this.selectedTask.delete(userId)
          return '选中的任务不存在，请重新选择 `/task select <id>`。'
        }

        if (!task.sessionId) {
          return `任务 **${selectedId}** 尚无活跃会话，等待分发后再追问。`
        }

        try {
          await this.orchestrator.continuePrompt(task.sessionId, question)
          return `💬 已向任务 **${selectedId}** 发送追问:\n   ${question}`
        } catch (err) {
          return `追问发送失败: ${err instanceof Error ? err.message : String(err)}`
        }
      }

      case 'status': {
        const id = args[1]
        const status = args[2]?.toLowerCase() as string
        if (!id || !status) return '用法: `/task status <id> pending|completed|cancelled`'
        const state = this.orchestrator.getState()
        const task = state.tasks.find((t: TaskState) => t.id === id)
        if (!task) return `未找到任务: ${id}`

        const validStatuses = ['pending', 'completed', 'cancelled']
        const mappedStatus = status === 'in_progress' ? 'running' : status
        if (!validStatuses.includes(mappedStatus)) {
          return `无效状态: ${status}。可用: ${validStatuses.join(', ')}`
        }

        this.orchestrator.getStore().updateTask({ ...task, status: mappedStatus as TaskState['status'] })
        return `✅ 任务 **${id}** 状态已更新为: ${mappedStatus}`
      }

      default:
        return `未知 /task 命令: ${sub}\n可用: create, list, select, ask, status`
    }
  }

  private async handleProject(args: string[]): Promise<string> {
    if (args.length === 0) {
      return '用法:\n  `/project goal`  `/project goal set <文本>`\n  `/project desc`  `/project desc set <文本>`\n  `/project progress`'
    }

    const sub = args[0]!.toLowerCase()

    switch (sub) {
      case 'goal': {
        if (args[1]?.toLowerCase() === 'set') {
          const goal = args.slice(2).join(' ')
          if (!goal) return '请提供项目目标: `/project goal set <文本>`'
          const config = this.orchestrator.getProjectConfig()
          config.goal = goal
          this.orchestrator.setProjectConfig(config)
          return `✅ 项目目标已设置:\n   ${goal}\n\n💡 **提示**：好的目标应包含"做什么"和"为什么"，例如"构建一个自动化系统，减少人工干预"。`
        }
        const config = this.orchestrator.getProjectConfig()
        return config.goal
          ? `🎯 **项目目标**\n${config.goal}`
          : '尚未设置项目目标。使用 `/project goal set <文本>` 设置。'
      }

      case 'desc': {
        if (args[1]?.toLowerCase() === 'set') {
          const desc = args.slice(2).join(' ')
          if (!desc) return '请提供项目描述: `/project desc set <文本>`'
          const config = this.orchestrator.getProjectConfig()
          config.description = desc
          this.orchestrator.setProjectConfig(config)
          return `✅ 项目描述已设置:\n   ${desc}\n\n💡 **提示**：好的描述应说明项目背景、范围和技术方案，让读者快速理解项目全貌。`
        }
        const config = this.orchestrator.getProjectConfig()
        return config.description
          ? `📝 **项目描述**\n${config.description}`
          : '尚未设置项目描述。使用 `/project desc set <文本>` 设置。'
      }

      case 'progress': {
        const config = this.orchestrator.getProjectConfig()
        const state = this.orchestrator.getState()
        const tasks = state.tasks

        const total = tasks.length
        const completed = tasks.filter((t: TaskState) => t.status === 'completed').length
        const inProgress = tasks.filter((t: TaskState) => t.status === 'running').length
        const pending = tasks.filter((t: TaskState) => t.status === 'pending').length
        const failed = tasks.filter((t: TaskState) => t.status === 'failed').length
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0

        const barLen = 20
        const filled = Math.round((completed / (total || 1)) * barLen)
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled)

        const lines: string[] = ['📊 **项目进度**', '━━━━━━━━━━━━━━━━']
        if (config.goal) lines.push('', `🎯 **目标:** ${config.goal}`)
        if (config.description) lines.push('', `📝 **描述:** ${config.description}`)
        lines.push('')
        lines.push(total > 0 ? `  ${bar}  ${pct}%` : '  暂无任务')
        lines.push('')
        lines.push(`  ✅ 已完成:    ${completed}`)
        lines.push(`  🔄 进行中:    ${inProgress}`)
        lines.push(`  ⏳ 等待中:    ${pending}`)
        if (failed > 0) lines.push(`  ❌ 失败:      ${failed}`)
        lines.push(`  📋 总计:      ${total}`)

        if (total > 0) {
          lines.push('', '📋 **分类明细**')
          const statusIcon: Record<string, string> = {
            pending: '⏳', running: '🔄', completed: '✅', failed: '❌', awaiting_review: '🔍', rejected: '🚫',
          }
          for (const task of tasks) {
            const icon = statusIcon[task.status] ?? '📌'
            const desc = task.description.length > 40 ? task.description.slice(0, 40) + '...' : task.description
            lines.push(`  ${icon} ${task.id} ${desc}`)
          }
        }

        return lines.join('\n')
      }

      default:
        return `未知 /project 命令: ${sub}\n可用: goal, desc, progress`
    }
  }

  private async handleComet(args: string[]): Promise<string> {
    const validSubs = ['open', 'design', 'build', 'verify', 'archive', 'hotfix', 'tweak']

    if (args.length === 0) {
      return `用法: /comet <${validSubs.join('|')}>\n\n子命令:\n${validSubs.map(s => `  ${s}`).join('\n')}`
    }

    const sub = args[0]!.toLowerCase()
    if (!validSubs.includes(sub)) {
      return `无效子命令: ${sub}\n可用: ${validSubs.join(', ')}`
    }

    const engine = (this.orchestrator as any).cometEngine
    if (!engine) return 'Comet 引擎未初始化'

    const state = engine.getCurrentState()
    return [
      `变更: ${state.changeName}`,
      `当前阶段: ${state.phase}`,
      `工作流: ${state.workflow}`,
      `守卫状态: ${state.guardStatus}`,
    ].join('\n')
  }
}
