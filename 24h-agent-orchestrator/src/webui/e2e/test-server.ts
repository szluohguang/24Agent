import { createHttpServer } from '../../server/http.js'
import { Orchestrator, type OrchestratorCallbacks } from '../../orchestrator/core.js'
import { createMockClient } from '../../test-utils/factories.js'

const mockClient = createMockClient()
const callbacks: OrchestratorCallbacks = {
  onStateChange: () => {},
  onTimeline: () => {},
  onStreamDelta: () => {},
  onAgentStateChange: () => {},
}

const orchestrator = new Orchestrator(mockClient.client as never, callbacks)

async function main() {
  const httpServer = await createHttpServer(orchestrator)
  const port = parseInt(process.env['PORT'] || '3000', 10)
  await httpServer.listen({ port, host: '0.0.0.0' })
  console.log(`[e2e-test-server] Running on http://localhost:${port}`)
}

main().catch((err) => {
  console.error('[e2e-test-server] Fatal:', err)
  process.exit(1)
})
