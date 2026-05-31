import fs from 'node:fs'
import path from 'node:path'

/**
 * 日志级别枚举，数字越小越详细。
 * debug 级别仅开发模式输出，生产模式只输出 info 及以上。
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const

/** 格式化为东八区时间字符串 YYYY-MM-DDTHH:mm:ss.SSS */
function localTimestamp(): string {
  const d = new Date()
  const fm = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = fm.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.${ms}`
}

/** 生产模式下仍要输出的核心事件标签集合 */
const CORE_TAGS = new Set([
  'startup',
  'shutdown',
  'task-create',
  'task-dispatch',
  'task-complete',
  'task-fail',
  'task-abort',
  'task-retry',
  'session-create',
  'session-error',
  'session-idle',
  'review',
  'config',
  'schedule',
  'hung',
  'eval',
  'fatal',
])

let globalLogger: Logger | null = null

/**
 * Logger — 结构化日志工具。
 * 支持 debug / production 两种模式，日志写入 logs/ 目录下的日期文件。
 * 生产模式只输出 CORE_TAGS 中的核心事件，减少磁盘和注意力消耗。
 */
export class Logger {
  private level: LogLevel
  private logStream: fs.WriteStream | null = null

  constructor(options?: { level?: LogLevel; logDir?: string; logFile?: string }) {
    // 日志级别选择：NODE_ENV=production 时默认为 INFO（过滤 DEBUG），否则 DEBUG
    const isProd = process.env['NODE_ENV'] === 'production'
    this.level = options?.level ?? (isProd ? LogLevel.INFO : LogLevel.DEBUG)

    // 按日期拆分日志文件，统一写入 logs/ 目录
    const logDir = options?.logDir ?? path.resolve(process.cwd(), 'logs')
    const dateStr = new Date().toISOString().slice(0, 10)
    const logFile = options?.logFile ?? `orchestrator-${dateStr}.log`
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    this.logStream = fs.createWriteStream(path.join(logDir, logFile), { flags: 'a' })

    this.info('startup', `Logger initialized, level=${LEVEL_NAMES[this.level]}, file=${logFile}`)
  }

  private write(level: LogLevel, tag: string, message: string, data?: unknown) {
    // 级别过滤：低于配置级别的跳过
    if (level < this.level) return

    // 生产模式过滤：仅非核心标签且低于 WARN 的日志跳过
    if (this.level >= LogLevel.INFO && level < LogLevel.WARN && !CORE_TAGS.has(tag)) return

    const timestamp = localTimestamp()
    const levelName = LEVEL_NAMES[level]
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    const line = `[${timestamp}] [${levelName}] [${tag}] ${message}${dataStr}`

    // 控制台输出：错误级别用 stderr，其余用 stdout
    if (level >= LogLevel.ERROR) {
      console.error(line)
    } else if (level >= LogLevel.WARN) {
      console.warn(line)
    } else {
      console.log(line)
    }

    // 写入日志文件
    this.logStream?.write(line + '\n')
  }

  debug(tag: string, message: string, data?: unknown) { this.write(LogLevel.DEBUG, tag, message, data) }

  info(tag: string, message: string, data?: unknown) { this.write(LogLevel.INFO, tag, message, data) }

  warn(tag: string, message: string, data?: unknown) { this.write(LogLevel.WARN, tag, message, data) }

  error(tag: string, message: string, data?: unknown) { this.write(LogLevel.ERROR, tag, message, data) }

  /** 关闭日志文件流 */
  close() {
    this.logStream?.end()
  }

  /** 获取全局单例，未初始化则自动创建 */
  static getInstance(): Logger {
    if (!globalLogger) {
      globalLogger = new Logger()
    }
    return globalLogger
  }

  /** 重置全局单例（仅测试或启动时使用） */
  static resetInstance(options?: { level?: LogLevel; logDir?: string; logFile?: string }) {
    if (globalLogger) {
      globalLogger.close()
    }
    globalLogger = new Logger(options)
    return globalLogger
  }
}
