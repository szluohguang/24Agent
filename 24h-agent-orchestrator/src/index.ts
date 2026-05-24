import { createOpencodeServer } from './orchestrator/acp-manager.js'
import { Orchestrator } from './orchestrator/core.js'
import { createHttpServer } from './server/http.js'
import { createBroadcastCallbacks } from './server/websocket.js'
import { initDatabase, closeDatabase } from './orchestrator/database.js'

async function main() {
  console.log('[orchestrator] Starting...')

  const database = initDatabase()
  console.log('[orchestrator] SQLite database initialized')

  const { client, server: ocServer } = await createOpencodeServer()
  console.log(`[orchestrator] opencode ACP server: ${ocServer.url}`)

  const callbacks = createBroadcastCallbacks()
  const orchestrator = new Orchestrator(client, callbacks, database)
  await orchestrator.start()

  const httpServer = await createHttpServer(orchestrator)

  const port = parseInt(process.env['PORT'] || '3000', 10)
  await httpServer.listen({ port, host: '0.0.0.0' })
  console.log(`[orchestrator] HTTP server: http://localhost:${port}`)

  const shutdown = async () => {
    console.log('[orchestrator] Shutting down...')
    orchestrator.stop()
    ocServer.close()
    await httpServer.close()
    closeDatabase()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[orchestrator] Fatal error:', err)
  process.exit(1)
})
