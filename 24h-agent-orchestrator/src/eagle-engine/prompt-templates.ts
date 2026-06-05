import type { SkillDef } from './SkillLoader'

export interface PromptContext {
  task: { id: string; description: string }
  skill: SkillDef
  projectContext: string
}

/**
 * 按 phase 渲染专属 ACP session prompt
 */
export function renderPhasePrompt(ctx: PromptContext): string {
  const { task, skill, projectContext } = ctx

  return `你是 Eagle ${skill.title}阶段 Agent。

请使用 skill tool 加载 'eagle' 技能。
然后执行 ${skill.command} 子命令。

## 职责
${skill.responsibilities.map(r => `- ${r}`).join('\n')}

## 严禁行为
${skill.forbidden.map(f => `- ${f}`).join('\n')}

## 任务
${task.description}

## 预期产物
${skill.artifacts.map(a => `- ${a}`).join('\n')}

## 项目上下文
${projectContext}`
}
