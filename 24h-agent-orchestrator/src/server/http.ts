import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerApiRoutes } from './api.js'
import { registerWebSocket } from './websocket.js'
import type { Orchestrator } from '../orchestrator/core.js'
import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webuiDist = path.resolve(__dirname, '..', 'webui', 'dist')

/** 创建 Fastify 服务器，注册 REST API、WebSocket 路由和静态文件服务 */
export async function createHttpServer(orchestrator: Orchestrator) {
  const app = Fastify({ logger: true })

  await app.register(fastifyWebsocket)

  registerApiRoutes(app, orchestrator)
  registerWebSocket(app, orchestrator)

  app.get('/health', async () => {
    const state = orchestrator.getState()
    const activeAgents = state.agents.filter((a) => a.status === 'running' || a.status === 'creating')
    return {
      status: 'ok',
      db: 'connected',
      agents: { active: activeAgents.length, total: state.agents.length },
      tasks: { total: state.tasks.length, running: state.tasks.filter((t) => t.status === 'running').length },
    }
  })

  await app.register(fastifyStatic, {
    root: webuiDist,
    prefix: '/',
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile('index.html')
  })

  return app
}