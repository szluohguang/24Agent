import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'

export interface SkillCheckResult {
  openspecReady: boolean
  eagleSkillsReady: boolean
  eagleOrchReady: boolean
  allReady: boolean
  missing: string[]
}

const EAGLE_PHASES = ['open', 'design', 'build', 'verify', 'archive']
const SUPERPOWER_SKILLS = [
  'brainstorming',
  'test-driven-development',
  'writing-plans',
  'subagent-driven-development',
  'verification-before-completion',
  'requesting-code-review',
  'finishing-a-development-branch',
  'executing-plans',
  'using-git-worktrees',
]
const GLOBAL_SUPERPOWERS_DIR = 'C:\\Users\\luo\\.config\\opencode\\skills\\superpowers'

export class SkillChecker {
  constructor(private baseDir: string) {}

  check(): SkillCheckResult {
    const missing: string[] = []

    const openspecPath = path.join(this.baseDir, '.openspec.yaml')
    const openspecReady = fs.existsSync(openspecPath)

    const eagleSkillPath = path.join(this.baseDir, '.opencode', 'skills', 'eagle', 'SKILL.md')
    const eagleSkillsReady = fs.existsSync(eagleSkillPath)

    const phasesDir = path.join(this.baseDir, '.opencode', 'skills', 'eagle', 'phases')
    const eaglePhasesReady = EAGLE_PHASES.every((p) => {
      const exists = fs.existsSync(path.join(phasesDir, `${p}.md`))
      if (!exists) missing.push(`.opencode/skills/eagle/phases/${p}.md`)
      return exists
    })

    const orchPath = path.join(this.baseDir, 'eagle-orchestration.json')
    const eagleOrchReady = fs.existsSync(orchPath)

    if (!openspecReady) missing.push('.openspec.yaml')
    if (!eagleSkillPath) missing.push('.opencode/skills/eagle/SKILL.md')
    if (!eagleOrchReady) missing.push('eagle-orchestration.json')

    return {
      openspecReady,
      eagleSkillsReady: eagleSkillsReady && eaglePhasesReady,
      eagleOrchReady,
      allReady: openspecReady && eagleSkillsReady && eaglePhasesReady && eagleOrchReady,
      missing,
    }
  }

  initOpenSpec(projectDir: string): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      exec(`openspec init "${projectDir}"`, { cwd: this.baseDir }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, message: stderr || error.message })
        } else {
          resolve({ success: true, message: stdout.trim() || undefined })
        }
      })
    })
  }

  installSkills(projectDir: string): { success: boolean; files: string[] } {
    const files: string[] = []

    const srcEagleDir = path.join(this.baseDir, 'skills', 'eagle')
    const dstEagleDir = path.join(projectDir, '.opencode', 'skills', 'eagle')

    if (fs.existsSync(srcEagleDir)) {
      this.copyRecursive(srcEagleDir, dstEagleDir)
      files.push('.opencode/skills/eagle/')
    }

    const srcOrch = path.join(this.baseDir, 'eagle-orchestration.json')
    const dstOrch = path.join(projectDir, 'eagle-orchestration.json')

    if (fs.existsSync(srcOrch)) {
      fs.cpSync(srcOrch, dstOrch, { recursive: false })
      files.push('eagle-orchestration.json')
    }

    for (const skill of SUPERPOWER_SKILLS) {
      const srcSkill = path.join(GLOBAL_SUPERPOWERS_DIR, skill)
      const dstSkill = path.join(projectDir, '.opencode', 'skills', 'superpowers', skill)
      if (fs.existsSync(srcSkill)) {
        this.copyRecursive(srcSkill, dstSkill)
        files.push(`.opencode/skills/superpowers/${skill}/`)
      }
    }

    return { success: true, files }
  }

  async initAll(projectDir: string): Promise<{
    success: boolean
    steps: { openspecInit: boolean; eagleInstall: boolean; superpowersInstall: boolean }
  }> {
    const openspecResult = await this.initOpenSpec(projectDir)
    const eagleResult = this.installSkills(projectDir)

    return {
      success: openspecResult.success && eagleResult.success,
      steps: {
        openspecInit: openspecResult.success,
        eagleInstall: eagleResult.files.some((f) => f.startsWith('.opencode/skills/eagle/')),
        superpowersInstall: eagleResult.files.some((f) =>
          f.startsWith('.opencode/skills/superpowers/')
        ),
      },
    }
  }

  private copyRecursive(src: string, dst: string): void {
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true })
    }
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const dstPath = path.join(dst, entry.name)
      if (entry.isDirectory()) {
        this.copyRecursive(srcPath, dstPath)
      } else {
        fs.cpSync(srcPath, dstPath, { recursive: false })
      }
    }
  }
}
