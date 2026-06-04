import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

export interface SkillDef {
  name: string
  title: string
  role: string
  command: string
  responsibilities: string[]
  forbidden: string[]
  artifacts: string[]
}

const FM_RE = /^---\s*\n([\s\S]*?)\n---/
const HEADING_RE = /##\s*(.+?)\s*\n([\s\S]*?)(?=\n##\s|$)/g
const BULLET_RE = /^[-*]\s+(.+)$/m

const DEFAULT_GENERIC: SkillDef = {
  name: 'generic-eagle-phase',
  title: '通用阶段',
  role: 'Eagle 通用阶段 Agent',
  command: 'eagle-generic',
  responsibilities: ['执行当前阶段任务', '遵循阶段门禁规则'],
  forbidden: ['不允许跨越阶段执行任务'],
  artifacts: ['openspec/changes/<name>/'],
}

function extractFrontmatter(raw: string): string | null {
  const m = raw.match(FM_RE)
  return m ? m[1] : null
}

function parseHeadingSection(raw: string, headings: string[]): string[] {
  const pat = headings.join('|')
  const regex = new RegExp(`##\\s*(?:${pat})\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, '')
  const m = raw.match(regex)
  if (!m) return []
  const results: string[] = []
  for (const line of m[1].split('\n')) {
    const t = line.trim()
    if (/^[-*]\s+/.test(t)) {
      results.push(t.replace(/^[-*]\s+/, '').trim())
    } else if (t && !t.startsWith('```') && !t.startsWith('#')) {
      const prev = results[results.length - 1]
      if (prev && !t.startsWith('-')) {
        results[results.length - 1] = t
      }
    }
  }
  return results.filter(Boolean)
}

function parseArtifactSection(raw: string, headings: string[]): string[] {
  const pat = headings.join('|')
  const regex = new RegExp(`##\\s*(?:${pat})\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, '')
  const m = raw.match(regex)
  if (!m) return []
  const results: string[] = []
  let inCodeBlock = false
  for (const line of m[1].split('\n')) {
    const t = line.trim()
    if (t.startsWith('```')) { inCodeBlock = !inCodeBlock; continue }
    if (inCodeBlock) {
      if (t) results.push(t)
    } else if (/^[-*]\s+/.test(t)) {
      results.push(t.replace(/^[-*]\s+/, '').trim())
    }
  }
  return results
}

function extractNameFromHeading(raw: string): string {
  const m = raw.match(/#\s*阶段[：:]\s*(.+?)\s*\(/)
  if (m) return m[1].trim()
  const m2 = raw.match(/#\s*Phase[：:]\s*(.+)/i)
  if (m2) return m2[1].trim()
  return 'unknown'
}

function parseHeadingFallback(raw: string): SkillDef {
  return {
    name: extractNameFromHeading(raw),
    title: '',
    role: '',
    command: extractNameFromHeading(raw),
    responsibilities: parseHeadingSection(raw, ['职责', 'Responsibilities']),
    forbidden: parseHeadingSection(raw, ['禁止行为', '禁止', 'Forbidden']),
    artifacts: parseArtifactSection(raw, ['产物', 'Artifacts']),
  }
}

export class SkillLoader {
  constructor(private baseDir: string = process.cwd()) {}

  load(phase: string): SkillDef {
    const filePath = path.join(
      this.baseDir,
      'skills',
      'eagle',
      'phases',
      `${phase}.skill.md`,
    )

    let raw: string
    try {
      raw = fs.readFileSync(filePath, 'utf-8')
    } catch {
      return { ...DEFAULT_GENERIC }
    }

    const fm = extractFrontmatter(raw)
    if (fm) {
      try {
        const parsed = yaml.load(fm) as Record<string, unknown>
        return {
          name: String(parsed.name ?? ''),
          title: String(parsed.title ?? ''),
          role: String(parsed.role ?? ''),
          command: String(parsed.command ?? ''),
          responsibilities: this.asStrArr(parsed.responsibilities),
          forbidden: this.asStrArr(parsed.forbidden),
          artifacts: this.asStrArr(parsed.artifacts),
        }
      } catch {
        // YAML parse failed → fall through to heading fallback
      }
    }

    return parseHeadingFallback(raw)
  }

  private asStrArr(val: unknown): string[] {
    if (Array.isArray(val)) return val.map(String)
    return []
  }
}
