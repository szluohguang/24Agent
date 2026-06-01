import fs from 'node:fs'
import path from 'node:path'
import QRCode from 'qrcode'
import { getUpdates } from './api.js'
import { sendTextMessage, splitText } from './send.js'
import { loadToken, saveToken, clearToken } from './auth.js'
import { getConfig } from './api.js'
import type { WeixinMessage, GetUpdatesResp } from './types.js'

export interface WeChatConfig {
  baseUrl: string
  cdnBaseUrl: string
  botType: string
  consoleToWechat: boolean
}

export interface WeChatLoginInfo {
  token: string
  userId: string
  accountId: string
  loginAt: string
}

type MessageHandler = (text: string, userId: string) => Promise<string | undefined>

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000
const MAX_CONSECUTIVE_FAILURES = 3
const BACKOFF_DELAY_MS = 30_000
const RETRY_DELAY_MS = 2_000
const SESSION_EXPIRED_ERRCODE = -14

interface StreamChunk {
  type: string
  content: string
  toolName?: string
}

class WeChatStreamSession {
  private userId: string
  private buffer: StreamChunk[] = []
  private throttleTimer: ReturnType<typeof setTimeout> | null = null
  private sendChain: Promise<void> = Promise.resolve()
  private typingInterval: ReturnType<typeof setTimeout> | null = null
  private opts: { baseUrl: string; token: string; contextToken?: string }
  private streamLevel: string
  private logFn: (msg: string) => void
  private destroyed = false

  constructor(userId: string, opts: { baseUrl: string; token: string; contextToken?: string }, streamLevel: string, logFn: (msg: string) => void) {
    this.userId = userId
    this.opts = opts
    this.streamLevel = streamLevel
    this.logFn = logFn
  }

  push(chunk: StreamChunk): void {
    if (this.destroyed) return
    this.buffer.push(chunk)
    this.startTyping()
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.throttleTimer) clearTimeout(this.throttleTimer)
    this.throttleTimer = setTimeout(() => this.flush(), 300)
  }

  private async flush(): Promise<void> {
    if (this.destroyed || this.buffer.length === 0) return
    const items = this.buffer.splice(0)
    const text = this.formatMessage(items)
    if (!text) return
    this.sendChain = this.sendChain.then(() => this.doSend(text))
    await this.sendChain
  }

  private formatMessage(items: StreamChunk[]): string {
    const lines: string[] = []
    for (const item of items) {
      switch (item.type) {
        case 'thinking':
          if (this.streamLevel === 'off') continue
          lines.push(`🧠 ${item.content.slice(0, 200)}`)
          break
        case 'tool_call':
          if (this.streamLevel === 'off') continue
          lines.push(`🔧 ${item.toolName || 'tool'}: ${item.content.slice(0, 100)}`)
          break
        case 'tool_result':
          if (this.streamLevel !== 'full') continue
          lines.push(`✅ ${item.content.slice(0, 200)}`)
          break
        case 'text':
          if (this.streamLevel !== 'full') continue
          lines.push(`📝 ${item.content}`)
          break
      }
    }
    return lines.join('\n')
  }

  private async doSend(text: string): Promise<void> {
    try {
      const { sendTextMessage } = await import('./send.js')
      const segments = splitText(text, 2000)
      for (const seg of segments) {
        await sendTextMessage(this.userId, seg, this.opts)
      }
    } catch (err) {
      this.logFn(`WeChat stream send error: ${String(err)}`)
    }
  }

  private startTyping(): void {
    if (this.typingInterval) return
    this.sendTypingOnce()
    this.typingInterval = setInterval(() => this.sendTypingOnce(), 10_000)
  }

  private async sendTypingOnce(): Promise<void> {
    try {
      const { sendTyping } = await import('./api.js')
      await sendTyping({
        baseUrl: this.opts.baseUrl,
        token: this.opts.token,
        body: {
          ilink_user_id: this.userId,
          typing_ticket: this.opts.contextToken ?? '',
          status: 1,
        },
      })
    } catch { /* ignore typing errors */ }
  }

  async finalize(): Promise<void> {
    this.destroyed = true
    if (this.throttleTimer) clearTimeout(this.throttleTimer)
    if (this.typingInterval) clearInterval(this.typingInterval)
    await this.flush()
  }
}

export class WeChatManager {
  private config: WeChatConfig
  private storageDir: string
  private loginInfo: WeChatLoginInfo | null = null
  private abortController: AbortController | null = null
  private onMessage: MessageHandler | null = null
  private logFn: (msg: string) => void
  private pollingPromise: Promise<void> | null = null
  private contextTokens: Map<string, string> = new Map()
  private streamSessions: Map<string, WeChatStreamSession> = new Map()

  constructor(config: WeChatConfig, storageDir: string, logFn?: (msg: string) => void) {
    this.config = config
    this.storageDir = storageDir
    this.logFn = logFn ?? (() => {})
  }

  setOnMessage(handler: MessageHandler): void {
    this.onMessage = handler
  }

  updateConfig(config: Partial<WeChatConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): WeChatConfig {
    return { ...this.config }
  }

  getLoginInfo(): WeChatLoginInfo | null {
    return this.loginInfo
  }

  isLoggedIn(): boolean {
    return this.loginInfo !== null && !!this.loginInfo.token
  }

  getStorageDir(): string {
    return this.storageDir
  }

  getContextToken(): string | undefined {
    return undefined
  }

  async tryRestoreLogin(): Promise<boolean> {
    const token = loadToken(this.storageDir)
    if (token && token.token) {
      this.loginInfo = {
        token: token.token,
        userId: token.userId,
        accountId: token.accountId,
        loginAt: token.savedAt,
      }
      this.logFn(`Restored WeChat login: ${token.accountId}`)
      return true
    }
    return false
  }

  async getQrCode(): Promise<{ qrcode: string; qrcodeImg: string }> {
    const { getBotQrcode } = await import('./api.js')
    const resp = await getBotQrcode({
      baseUrl: this.config.baseUrl,
      botType: this.config.botType,
    })
    const qrDataUrl = await QRCode.toDataURL(resp.qrcode_img_content, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
    return { qrcode: resp.qrcode, qrcodeImg: qrDataUrl }
  }

  async checkQrStatus(qrcode: string): Promise<{
    status: string
    loginInfo?: WeChatLoginInfo
  }> {
    const { getQrcodeStatus } = await import('./api.js')
    const resp = await getQrcodeStatus({ baseUrl: this.config.baseUrl, qrcode })
    switch (resp.status) {
      case 'confirmed': {
        const info: WeChatLoginInfo = {
          token: resp.bot_token!,
          userId: resp.ilink_user_id!,
          accountId: resp.ilink_bot_id!,
          loginAt: new Date().toISOString(),
        }
        saveToken(this.storageDir, {
          token: info.token,
          baseUrl: this.config.baseUrl,
          accountId: info.accountId,
          userId: info.userId,
          savedAt: info.loginAt,
        })
        this.loginInfo = info
        this.logFn(`WeChat login confirmed: ${info.accountId}`)
        this.startMonitor()
        return { status: 'confirmed', loginInfo: info }
      }
      default:
        return { status: resp.status }
    }
  }

  logout(): void {
    this.stopMonitor()
    clearToken(this.storageDir)
    this.loginInfo = null
    this.logFn('WeChat logged out')
  }

  setLoginFromQr(token: string, userId: string, accountId: string): void {
    saveToken(this.storageDir, {
      token,
      baseUrl: this.config.baseUrl,
      accountId,
      userId,
      savedAt: new Date().toISOString(),
    })
    this.loginInfo = { token, userId, accountId, loginAt: new Date().toISOString() }
  }

  getFirstContactUserId(): string | undefined {
    return this.contextTokens.keys().next().value
  }

  async sendToUser(userId: string, text: string, contextToken?: string): Promise<void> {
    if (!this.loginInfo) return
    const effectiveToken = contextToken ?? this.contextTokens.get(userId)
    const opts = {
      baseUrl: this.config.baseUrl,
      token: this.loginInfo.token,
      contextToken: effectiveToken,
    }
    const segments = splitText(text, 2000)
    for (const seg of segments) {
      try {
        await sendTextMessage(userId, seg, opts)
      } catch (err) {
        this.logFn(`WeChat send error: ${String(err)}`)
      }
    }
  }

  async streamToUser(userId: string, sessionId: string, chunk: StreamChunk, streamLevel: string): Promise<void> {
    if (!this.loginInfo) return
    let session = this.streamSessions.get(sessionId)
    if (!session) {
      session = new WeChatStreamSession(userId, {
        baseUrl: this.config.baseUrl,
        token: this.loginInfo.token,
        contextToken: this.contextTokens.get(userId),
      }, streamLevel, this.logFn)
      this.streamSessions.set(sessionId, session)
    }
    session.push(chunk)
  }

  async finalizeStream(sessionId: string): Promise<void> {
    const session = this.streamSessions.get(sessionId)
    if (session) {
      await session.finalize()
      this.streamSessions.delete(sessionId)
    }
  }

  async startMonitor(): Promise<void> {
    if (!this.loginInfo || this.pollingPromise) return

    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()
    this.pollingPromise = this.runMonitorLoop()
    this.pollingPromise.catch((err) => {
      this.logFn(`WeChat monitor stopped: ${String(err)}`)
      this.pollingPromise = null
    })
  }

  stopMonitor(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.pollingPromise = null
  }

  private async runMonitorLoop(): Promise<void> {
    const signal = this.abortController!.signal
    const { baseUrl } = this.config
    const token = this.loginInfo!.token

    const syncBufPath = path.join(this.storageDir, 'sync-buf.json')
    function loadSyncBuf(): string {
      if (!fs.existsSync(syncBufPath)) return ''
      try {
        const data = JSON.parse(fs.readFileSync(syncBufPath, 'utf-8')) as { get_updates_buf?: string }
        return data.get_updates_buf ?? ''
      } catch { return '' }
    }
    function saveSyncBuf(buf: string): void {
      fs.mkdirSync(path.dirname(syncBufPath), { recursive: true })
      fs.writeFileSync(syncBufPath, JSON.stringify({ get_updates_buf: buf }), 'utf-8')
    }

    let getUpdatesBuf = loadSyncBuf()
    let nextTimeoutMs = DEFAULT_LONG_POLL_TIMEOUT_MS
    let consecutiveFailures = 0

    while (!signal.aborted) {
      try {
        const resp: GetUpdatesResp = await getUpdates({
          baseUrl,
          token,
          get_updates_buf: getUpdatesBuf,
          timeoutMs: nextTimeoutMs,
        })

        if (resp.longpolling_timeout_ms != null && resp.longpolling_timeout_ms > 0) {
          nextTimeoutMs = resp.longpolling_timeout_ms
        }

        const isApiError =
          (resp.ret !== undefined && resp.ret !== 0) ||
          (resp.errcode !== undefined && resp.errcode !== 0)

        if (isApiError) {
          const isSessionExpired =
            resp.errcode === SESSION_EXPIRED_ERRCODE || resp.ret === SESSION_EXPIRED_ERRCODE

          if (isSessionExpired) {
            this.logFn(`Session expired (errcode ${SESSION_EXPIRED_ERRCODE}), pausing 1 hour...`)
            consecutiveFailures = 0
            await this.sleep(60 * 60_000, signal)
            continue
          }

          consecutiveFailures++
          this.logFn(`getUpdates failed: ret=${resp.ret} errcode=${resp.errcode} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`)

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            consecutiveFailures = 0
            await this.sleep(BACKOFF_DELAY_MS, signal)
          } else {
            await this.sleep(RETRY_DELAY_MS, signal)
          }
          continue
        }

        consecutiveFailures = 0

        if (resp.get_updates_buf != null && resp.get_updates_buf !== '') {
          saveSyncBuf(resp.get_updates_buf)
          getUpdatesBuf = resp.get_updates_buf
        }

        for (const msg of resp.msgs ?? []) {
          await this.handleIncomingMessage(msg)
        }
      } catch (err) {
        if (signal.aborted) return
        consecutiveFailures++
        this.logFn(`getUpdates error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${String(err)}`)

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          consecutiveFailures = 0
          await this.sleep(BACKOFF_DELAY_MS, signal)
        } else {
          await this.sleep(RETRY_DELAY_MS, signal)
        }
      }
    }
  }

  private async handleIncomingMessage(msg: WeixinMessage): Promise<void> {
    if (!msg.item_list || msg.item_list.length === 0) return

    if (msg.group_id) return

    const textItem = msg.item_list[0]?.text_item
    if (!textItem || !textItem.text) return

    const userId = msg.from_user_id
    const contextToken = msg.context_token
    if (!userId || !textItem.text.trim()) return

    if (contextToken) {
      this.contextTokens.set(userId, contextToken)
    }

    if (this.onMessage) {
      const reply = await this.onMessage(textItem.text.trim(), userId)
      if (reply && this.loginInfo) {
        await this.sendToUser(userId, reply, contextToken)
      }
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new Error('aborted')); return }
      const t = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')) }, { once: true })
    })
  }
}
