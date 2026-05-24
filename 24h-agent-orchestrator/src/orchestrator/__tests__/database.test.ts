import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initDatabase, getDb, closeDatabase } from '../database.js'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'db-test-'))

describe('database module', () => {
  beforeEach(() => {
    closeDatabase()
  })

  afterEach(() => {
    closeDatabase()
  })

  describe('initDatabase()', () => {
    it('creates a valid database file at the given path', () => {
      const dbPath = path.join(TEMP_DIR, 'test.db')
      const db = initDatabase(dbPath)

      expect(db).toBeInstanceOf(Database)
      expect(db.open).toBe(true)

      const row = db.prepare('SELECT 1 AS ok').get() as { ok: number }
      expect(row.ok).toBe(1)

      db.close()
    })

    it('creates all required tables', () => {
      const db = initDatabase(':memory:')

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all() as { name: string }[]

      const names = tables.map(t => t.name)
      expect(names).toContain('tasks')
      expect(names).toContain('agents')
      expect(names).toContain('timeline')
      expect(names).toContain('config')
      expect(names).toContain('schedules')

      db.close()
    })

    it('creates tasks table with correct schema', () => {
      const db = initDatabase(':memory:')

      const cols = db.prepare('PRAGMA table_info(tasks)').all() as {
        name: string; type: string; notnull: number; pk: number
      }[]

      const colMap = new Map(cols.map(c => [c.name, c]))
      expect(colMap.get('id')!.pk).toBe(1)
      expect(colMap.get('id')!.type.toUpperCase()).toMatch(/TEXT/)
      expect(colMap.get('description')!.notnull).toBe(1)
      expect(colMap.get('status')!.notnull).toBe(1)
      expect(colMap.get('createdAt')!.notnull).toBe(1)
      expect(colMap.get('updatedAt')!.notnull).toBe(1)

      db.close()
    })

    it('creates agents table with correct schema', () => {
      const db = initDatabase(':memory:')

      const cols = db.prepare('PRAGMA table_info(agents)').all() as {
        name: string; type: string; notnull: number; pk: number
      }[]

      const colMap = new Map(cols.map(c => [c.name, c]))
      expect(colMap.get('sessionId')!.pk).toBe(1)
      expect(colMap.get('taskId')!.notnull).toBe(1)
      expect(colMap.get('status')!.notnull).toBe(1)
      expect(colMap.get('healthStatus')!.notnull).toBe(1)

      db.close()
    })

    it('creates timeline table with correct schema', () => {
      const db = initDatabase(':memory:')

      const cols = db.prepare('PRAGMA table_info(timeline)').all() as {
        name: string
      }[]

      const names = cols.map(c => c.name)
      expect(names).toContain('id')
      expect(names).toContain('time')
      expect(names).toContain('source')
      expect(names).toContain('sessionId')
      expect(names).toContain('type')
      expect(names).toContain('message')

      db.close()
    })

    it('creates config table with correct schema', () => {
      const db = initDatabase(':memory:')

      const cols = db.prepare('PRAGMA table_info(config)').all() as {
        name: string; type: string; notnull: number; pk: number
      }[]

      const colMap = new Map(cols.map(c => [c.name, c]))
      expect(colMap.get('key')!.pk).toBe(1)
      expect(colMap.get('value')!.notnull).toBe(1)

      db.close()
    })

    it('creates schedules table with correct schema', () => {
      const db = initDatabase(':memory:')

      const cols = db.prepare('PRAGMA table_info(schedules)').all() as {
        name: string; type: string; notnull: number; pk: number
      }[]

      const colMap = new Map(cols.map(c => [c.name, c]))
      expect(colMap.get('id')!.pk).toBe(1)
      expect(colMap.get('cronExpr')!.notnull).toBe(1)
      expect(colMap.get('enabled')!.notnull).toBe(1)

      db.close()
    })

    it('enables WAL journal mode', () => {
      const dbPath = path.join(TEMP_DIR, 'wal-test.db')
      const db = initDatabase(dbPath)

      const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }
      expect(row.journal_mode.toUpperCase()).toBe('WAL')

      db.close()
    })

    it('enables foreign keys', () => {
      const db = initDatabase(':memory:')

      const row = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }
      expect(row.foreign_keys).toBe(1)

      db.close()
    })

    it('creates the data directory if it does not exist', () => {
      const nestedPath = path.join(TEMP_DIR, 'nested', 'sub', 'custom.db')
      const db = initDatabase(nestedPath)

      expect(fs.existsSync(path.dirname(nestedPath))).toBe(true)
      expect(db.open).toBe(true)

      db.close()
      fs.rmSync(path.dirname(nestedPath), { recursive: true, force: true })
    })

    it('returns the same singleton instance on repeated calls', () => {
      const dbPath = path.join(TEMP_DIR, 'singleton-test.db')
      const db1 = initDatabase(dbPath)
      const db2 = initDatabase(dbPath)

      expect(db1).toBe(db2)

      db1.close()
    })
  })

  describe('getDb()', () => {
    it('returns the database instance after initDatabase()', () => {
      const db = initDatabase(':memory:')
      expect(getDb()).toBe(db)
      db.close()
    })

    it('throws an error if called before initDatabase()', () => {
      closeDatabase()
      expect(() => getDb()).toThrow('Database not initialized')
    })
  })

  describe('closeDatabase()', () => {
    it('closes the database and sets internal reference to null', () => {
      const db = initDatabase(':memory:')
      expect(db.open).toBe(true)

      closeDatabase()

      expect(db.open).toBe(false)
      expect(() => getDb()).toThrow('Database not initialized')
    })

    it('is safe to call multiple times', () => {
      initDatabase(':memory:')
      closeDatabase()
      expect(() => closeDatabase()).not.toThrow()
    })

    it('is safe to call when database was never initialized', () => {
      closeDatabase()
      expect(() => closeDatabase()).not.toThrow()
    })
  })

  describe('in-memory database', () => {
    it('initializes and operates correctly with :memory: path', () => {
      const db = initDatabase(':memory:')

      db.exec(`INSERT INTO config (key, value) VALUES ('test_key', 'test_value')`)
      const row = db.prepare("SELECT value FROM config WHERE key = 'test_key'").get() as { value: string }
      expect(row.value).toBe('test_value')

      db.close()
    })

    it('does not create any files on disk for :memory:', () => {
      const filesBefore = fs.readdirSync(TEMP_DIR).length
      initDatabase(':memory:').close()
      const filesAfter = fs.readdirSync(TEMP_DIR).length

      expect(filesAfter).toBe(filesBefore)
    })
  })
})
