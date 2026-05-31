import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { registerApiRoutes } from './api.js'
import { registerWebSocket } from './websocket.js'
import type { Orchestrator } from '../orchestrator/core.js'
import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 生产: dist/server/../webui/dist = dist/webui/dist (手动复制)
// 开发: src/server/../webui/dist = src/webui/dist (tsx 直接运行)
const prodWebui = path.resolve(__dirname, '..', 'webui', 'dist')
const devWebui = path.resolve(__dirname, '..', '..', 'src', 'webui', 'dist')
const webuiDist = fs.existsSync(prodWebui) ? prodWebui : devWebui

// games 目录
const prodGames = path.resolve(__dirname, '..', '..', 'games')
const devGames = path.resolve(__dirname, '..', '..', '..', 'games')
const gamesDir = fs.existsSync(prodGames) ? prodGames : devGames

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

  // 游戏静态文件服务
  if (fs.existsSync(gamesDir)) {
    await app.register(fastifyStatic, {
      root: gamesDir,
      prefix: '/games/',
      decorateReply: false,
    })
  }

  await app.register(fastifyStatic, {
    root: webuiDist,
    prefix: '/',
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile('index.html')
  })

  return app
}