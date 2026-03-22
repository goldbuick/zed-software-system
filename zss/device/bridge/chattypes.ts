import { MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

export const CHAT_KIND = {
  TWITCH: 'twitch',
  IRC: 'irc',
  XMPP: 'xmpp',
} as const

export type CHAT_KIND = (typeof CHAT_KIND)[keyof typeof CHAT_KIND]

export const ALL_CHAT_KINDS: CHAT_KIND[] = [
  CHAT_KIND.TWITCH,
  CHAT_KIND.IRC,
  CHAT_KIND.XMPP,
]

export type BRIDGE_CHAT_START_OBJECT = {
  kind: CHAT_KIND
  routekey: string
  /** IRC: full wss:// or ws:// URL (path allowed) */
  websocketurl?: string
  channel?: string
  nick?: string
  password?: string
  /** XMPP */
  service?: string
  domain?: string
  username?: string
  muc?: string
  /** XMPP MUC display nick (defaults to username) */
  mucnick?: string
}

export type BRIDGE_CHAT_START_PAYLOAD = string | BRIDGE_CHAT_START_OBJECT

export function normalizechatkind(value: string): MAYBE<CHAT_KIND> {
  const n = NAME(value)
  if (n === CHAT_KIND.TWITCH || n === CHAT_KIND.IRC || n === CHAT_KIND.XMPP) {
    return n
  }
  return undefined
}

export function parsechatstartpayload(data: unknown): MAYBE<BRIDGE_CHAT_START_OBJECT> {
  if (typeof data === 'string') {
    const channel = data.trim()
    if (!channel) {
      return undefined
    }
    return { kind: CHAT_KIND.TWITCH, routekey: channel }
  }
  if (typeof data !== 'object' || data === null) {
    return undefined
  }
  const o = data as Record<string, unknown>
  const kind = normalizechatkind(String(o.kind ?? ''))
  const routekey = typeof o.routekey === 'string' ? o.routekey.trim() : ''
  if (!kind || !routekey) {
    return undefined
  }
  return {
    kind,
    routekey,
    websocketurl:
      typeof o.websocketurl === 'string' ? o.websocketurl.trim() : undefined,
    channel: typeof o.channel === 'string' ? o.channel.trim() : undefined,
    nick: typeof o.nick === 'string' ? o.nick.trim() : undefined,
    password: typeof o.password === 'string' ? o.password : undefined,
    service: typeof o.service === 'string' ? o.service.trim() : undefined,
    domain: typeof o.domain === 'string' ? o.domain.trim() : undefined,
    username: typeof o.username === 'string' ? o.username.trim() : undefined,
    muc: typeof o.muc === 'string' ? o.muc.trim() : undefined,
    mucnick: typeof o.mucnick === 'string' ? o.mucnick.trim() : undefined,
  }
}
