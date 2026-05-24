import { createOpencodeServer } from './orchestrator/acp-manager.js'
import { Orchestrator } from './orchestrator/core.js'
import { createHttpServer } from './server/http.js'
import { createBroadcastCallbacks } from './server/websocket.js'

/** 启动整个系统：opencode ACP 服务 + 编排器 + HTTP/WS + WebUI */
async function main() {
  console.log('[orchestrator] Starting...')

  const { client, server: ocServer } = await createOpencodeServer()
  console.log(`[orchestrator] opencode ACP server: ${ocServer.url}`)

  // 广播回调使 Orchestrator 的状态变更自动推送到所有 WebSocket 客户端
  const callbacks = createBroadcastCallbacks()
  const orchestrator = new Orchestrator(client, callbacks)
  await orchestrator.start()

  const httpServer = await createHttpServer(orchestrator)

  const port = parseInt(process.env['PORT'] || '3000', 10)
  await httpServer.listen({ port, host: '0.0.0.0' })
  console.log(`[orchestrator] HTTP server: http://localhost:${port}`)

  // 优雅关闭：先停编排器，再关 ACP 和 HTTP
  const shutdown = async () => {
    console.log('[orchestrator] Shutting down...')
    orchestrator.stop()
    ocServer.close()
    await httpServer.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[orchestrator] Fatal error:', err)
  process.exit(1)
})
