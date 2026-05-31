import { Logger } from '../orchestrator/logger.js'

const logger = Logger.getInstance()

export interface WebhookConfig {
  url: string
  events: WebhookEvent[]
  enabled: boolean
}

export type WebhookEvent =
  | 'task.completed'
  | 'task.failed'
  | 'task.dispatched'
  | 'task.awaiting_review'
  | 'task.review_approved'
  | 'task.review_rejected'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: number
  task: {
    id: string
    description: string
    status: string
    result?: { summary: string; cost: number }
    error?: string
  }
}

export class Notifier {
  private webhooks: WebhookConfig[] = []

  setWebhooks(configs: WebhookConfig[]): void {
    this.webhooks = configs.filter((c) => c.enabled)
  }

  getWebhooks(): WebhookConfig[] {
    return this.webhooks
  }

  async notify(event: WebhookEvent, task: WebhookPayload['task']): Promise<void> {
    const matched = this.webhooks.filter((w) => w.events.includes(event))
    if (matched.length === 0) return

    const payload: WebhookPayload = { event, timestamp: Date.now(), task }

    await Promise.allSettled(matched.map((w) => this.send(w.url, payload)))
  }

  private async send(url: string, payload: WebhookPayload): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        logger.warn('webhook', `Webhook ${url} returned ${res.status}`, { status: res.status })
      } else {
        logger.info('webhook', `Webhook sent to ${url}`, { event: payload.event })
      }
    } catch (err) {
      logger.error('webhook', `Webhook ${url} failed`, { error: err instanceof Error ? err.message : String(err) })
    }
  }
}
