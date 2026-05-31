import { createOpencodeServer, freePort } from './orchestrator/acp-manager.js'
import { Orchestrator } from './orchestrator/core.js'
import { createHttpServer } from './server/http.js'
import { createBroadcastCallbacks } from './server/websocket.js'
import { initDatabase, closeDatabase } from './orchestrator/database.js'
import { Logger } from './orchestrator/logger.js'

const logger = Logger.getInstance()

// 捕获未处理的 Promise rejection，记录后阻止进程崩溃
process.on('unhandledRejection', (reason) => {
  logger.error('fatal', 'Unhandled rejection', { error: reason instanceof Error ? reason.message : String(reason), stack: reason instanceof Error ? reason.stack : undefined })
})

process.on('uncaughtException', (err) => {
  logger.error('fatal', 'Uncaught exception', { error: err.message, stack: err.stack })
})

async function main() {
  logger.info('startup', 'Orchestrator starting...')

  const database = initDatabase()
  logger.info('startup', 'SQLite database initialized')

  const { client, server: ocServer } = await createOpencodeServer()
  logger.info('startup', `opencode ACP server: ${ocServer.url}`)

  let orchestrator!: Orchestrator
  const callbacks = createBroadcastCallbacks(() => orchestrator.getState())
  orchestrator = new Orchestrator(client, callbacks, database)
  await orchestrator.start()

  // 清理 HTTP 服务端口的残留进程（本 orchestrator 独占）
  const port = parseInt(process.env['PORT'] || '3000', 10)
  freePort(port)

  const httpServer = await createHttpServer(orchestrator)

  await httpServer.listen({ port, host: '0.0.0.0' })
  logger.info('startup', `HTTP server: http://localhost:${port}`)

  const shutdown = async () => {
    logger.info('shutdown', 'Orchestrator shutting down...')
    orchestrator.stop()
    ocServer.close()
    await httpServer.close()
    closeDatabase()
    logger.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  const log = Logger.getInstance()
  log.error('fatal', 'Orchestrator fatal error', { error: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
