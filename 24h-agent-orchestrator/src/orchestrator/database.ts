import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

/** 数据文件存储目录和文件名 */
const DB_DIR = 'data'
const DB_FILE = 'orchestrator.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

/**
 * 初始化 SQLite 数据库（单例模式）。
 * 启用 WAL 模式提升并发读性能，启用外键约束保证数据一致性。
 */
export function initDatabase(dbPath?: string): Database.Database {
  if (db) return db
  const resolvedPath = dbPath || path.resolve(process.cwd(), DB_DIR, DB_FILE)

  const dir = path.dirname(resolvedPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  db = new Database(resolvedPath)

  // WAL 模式：写操作不阻塞读操作
  db.pragma('journal_mode = WAL')
  // 全同步：每次写入都等待磁盘确认，牺牲性能换数据安全
  db.pragma('synchronous = FULL')
  // 外键约束：保证 agents.taskId 等关联完整性
  db.pragma('foreign_keys = ON')

  createTables(db)
  migrateSchema(db)

  return db
}

/** 创建所有必要的表结构（幂等，IF NOT EXISTS） */
function createTables(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      dependsOn TEXT NOT NULL DEFAULT '[]',
      sessionId TEXT,
      retryCount INTEGER NOT NULL DEFAULT 0,
      maxRetries INTEGER NOT NULL DEFAULT 10,
      error TEXT,
      permission TEXT NOT NULL DEFAULT 'safe',
      budget REAL NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      cometPhase TEXT
    );

    CREATE TABLE IF NOT EXISTS agents (
      sessionId TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'creating',
      startTime INTEGER NOT NULL,
      model TEXT,
      provider TEXT,
      lastHeartbeat INTEGER NOT NULL,
      watchdogTimeout INTEGER NOT NULL DEFAULT 120000,
      healthStatus TEXT NOT NULL DEFAULT 'healthy'
    );

    CREATE TABLE IF NOT EXISTS timeline (
      id TEXT PRIMARY KEY,
      time INTEGER NOT NULL,
      source TEXT NOT NULL,
      sessionId TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      action TEXT NOT NULL,
      feedback TEXT,
      reviewer TEXT NOT NULL DEFAULT 'user',
      reviewedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      cronExpr TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'safe',
      budget REAL NOT NULL DEFAULT 0,
      maxRetries INTEGER NOT NULL DEFAULT 10,
      enabled INTEGER NOT NULL DEFAULT 1,
      lastTriggered INTEGER NOT NULL DEFAULT 0
    );
  `)
}

/** 执行增量 schema 迁移，兼容旧版数据库 */
function migrateSchema(database: Database.Database) {
  const cols = database.prepare("PRAGMA table_info('tasks')").all() as { name: string }[]
  const colNames = cols.map(c => c.name)
  if (!colNames.includes('cometPhase')) {
    database.exec("ALTER TABLE tasks ADD COLUMN cometPhase TEXT")
  }
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
