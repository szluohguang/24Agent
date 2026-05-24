import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DB_DIR = 'data'
const DB_FILE = 'orchestrator.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function initDatabase(dbPath?: string): Database.Database {
  if (db) return db
  const resolvedPath = dbPath || path.resolve(process.cwd(), DB_DIR, DB_FILE)

  const dir = path.dirname(resolvedPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  db = new Database(resolvedPath)

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = FULL')
  db.pragma('foreign_keys = ON')

  createTables(db)

  return db
}

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
      updatedAt INTEGER NOT NULL
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

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
