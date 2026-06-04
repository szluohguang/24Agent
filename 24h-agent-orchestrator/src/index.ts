import path from 'node:path'
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

  // 先创建 orchestrator 读取项目目录配置
  const storageDir = process.env['STORAGE_DIR'] || path.join(process.cwd(), 'data')
  const callbacks = createBroadcastCallbacks(() => orchestrator?.getState())
  let orchestrator: Orchestrator | undefined
  const tempClient = await createOpencodeServer()
  orchestrator = new Orchestrator(tempClient.client, callbacks, database, storageDir)

  // 读取项目目录，重启 ACP server 到项目目录
  const projectConfig = orchestrator.getProjectConfig()
  const projectDir = projectConfig.directory || undefined
  if (projectDir) freePort(4096)
  tempClient.server.close()
  const { client, server: ocServer } = await createOpencodeServer(projectDir)
  ;(orchestrator as any).client = client

  logger.info('startup', `opencode ACP server: ${ocServer.url}${projectDir ? ` (workdir: ${projectDir})` : ''}`)

  await orchestrator.start()

  // 清理 HTTP 服务端口的残留进程
  const port = parseInt(process.env['PORT'] || '3000', 10)
  freePort(port)

  const httpServer = await createHttpServer(orchestrator)

  await httpServer.listen({ port, host: '0.0.0.0' })
  logger.info('startup', `HTTP server: http://localhost:${port}`)

  const shutdown = async () => {
    logger.info('shutdown', 'Orchestrator shutting down...')
    orchestrator?.stop()
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
