import crypto from 'node:crypto'
import { sendMessage } from './api.js'
import { MessageType, MessageState } from './types.js'

export interface WeixinSendOpts {
  baseUrl: string
  token?: string
  contextToken?: string
}

export async function sendTextMessage(
  to: string,
  text: string,
  opts: WeixinSendOpts,
  clientId?: string,
): Promise<string> {
  const id = clientId ?? `wechat-acp-${crypto.randomUUID()}`
  const msg: Record<string, unknown> = {
    from_user_id: '',
    to_user_id: to,
    client_id: id,
    message_type: MessageType.BOT,
    message_state: MessageState.FINISH,
    item_list: [{ type: 1, text_item: { text } }],
  }
  if (opts.contextToken) {
    msg.context_token = opts.contextToken
  }
  await sendMessage({
    baseUrl: opts.baseUrl,
    token: opts.token,
    body: { msg: msg as typeof msg & { context_token?: string } },
  })
  return id
}

export function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]

  const segments: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      segments.push(remaining)
      break
    }

    let breakAt = remaining.lastIndexOf('\n', maxLen)
    if (breakAt <= 0) breakAt = maxLen

    segments.push(remaining.substring(0, breakAt))
    remaining = remaining.substring(breakAt).replace(/^\n/, '')
  }

  return segments
}
