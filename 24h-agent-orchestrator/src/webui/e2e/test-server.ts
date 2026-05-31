import Database from 'better-sqlite3'
import { createHttpServer } from '../../server/http.js'
import { Orchestrator } from '../../orchestrator/core.js'
import { createMockClient } from '../../test-utils/factories.js'
import { createBroadcastCallbacks, broadcastToClients } from '../../server/websocket.js'

const mockClient = createMockClient()

// 配置空事件流（orchestrator.start 中 subscribeGlobalEvents 会消费该流）
mockClient.setEventStream([])

const db = new Database(':memory:')
db.pragma('journal_mode = WAL')
db.pragma('synchronous = FULL')
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    dependsOn TEXT NOT NULL DEFAULT '[]', sessionId TEXT, retryCount INTEGER NOT NULL DEFAULT 0,
    maxRetries INTEGER NOT NULL DEFAULT 10, error TEXT, permission TEXT NOT NULL DEFAULT 'safe',
    budget REAL NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS agents (
    sessionId TEXT PRIMARY KEY, taskId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'creating',
    startTime INTEGER NOT NULL, model TEXT, provider TEXT, lastHeartbeat INTEGER NOT NULL,
    watchdogTimeout INTEGER NOT NULL DEFAULT 120000, healthStatus TEXT NOT NULL DEFAULT 'healthy'
  );
  CREATE TABLE IF NOT EXISTS timeline (
    id TEXT PRIMARY KEY, time INTEGER NOT NULL, source TEXT NOT NULL, sessionId TEXT,
    type TEXT NOT NULL, message TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, taskId TEXT NOT NULL, action TEXT NOT NULL,
    feedback TEXT, reviewer TEXT NOT NULL DEFAULT 'user', reviewedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY, description TEXT NOT NULL, cronExpr TEXT NOT NULL,
    permission TEXT NOT NULL DEFAULT 'safe', budget REAL NOT NULL DEFAULT 0,
    maxRetries INTEGER NOT NULL DEFAULT 10, enabled INTEGER NOT NULL DEFAULT 1,
    lastTriggered INTEGER NOT NULL DEFAULT 0
  );
`)

// 让 sessionPrompt 直接广播流式 delta 到 WebSocket 客户端，
// 模拟真实场景中 SSE → event-stream.ts → websocket.ts 的路径
const mockStreamDeltas = ['正在', '处理', '任务', '...', '完成', '！']
mockClient.mocks.sessionPrompt.mockImplementation(async () => {
  for (const delta of mockStreamDeltas) {
    broadcastToClients({ type: 'stream-delta', sessionId: 'session-mock-001', delta })
  }
  broadcastToClients({ type: 'agent-state', sessionId: 'session-mock-001', state: { status: 'idle' } })
  return undefined
})

const callbacks = createBroadcastCallbacks(() => orchestrator.getState())
const orchestrator = new Orchestrator(mockClient.client as never, callbacks, db)

async function main() {
  await orchestrator.start()

  const httpServer = await createHttpServer(orchestrator)
  const port = parseInt(process.env['PORT'] || '3000', 10)
  await httpServer.listen({ port, host: '0.0.0.0' })
  console.log(`[e2e-test-server] Running on http://localhost:${port}`)
}

main().catch((err) => {
  console.error('[e2e-test-server] Fatal:', err)
  process.exit(1)
})
