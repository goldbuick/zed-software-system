import { Client as IrcClientCtor } from 'irc-framework'
import { ispresent } from 'zss/mapping/types'

import { CHAT_KIND } from './chattypes'
import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import type { TWITCH_CHAT_HANDLERS } from './twitchchatconnector'

export type IRC_CONNECT_OPTIONS = {
  routekey: string
  websocketurl: string
  channel: string
  nick: string
  password?: string
  handlers: TWITCH_CHAT_HANDLERS
}

function normalizechannel(ch: string) {
  const t = ch.trim()
  if (!t) {
    return ''
  }
  return t.startsWith('#') || t.startsWith('&') ? t : `#${t}`
}

function parseircwebsocketurl(urlstr: string) {
  const u = new URL(urlstr)
  const tls = u.protocol === 'wss:'
  const host = u.hostname
  const port =
    u.port !== ''
      ? parseInt(u.port, 10)
      : tls
        ? 443
        : 80
  const path = `${u.pathname}${u.search}` || ''
  return { host, port, path, tls }
}

export function createircchatconnector(opts: IRC_CONNECT_OPTIONS): CHAT_CONNECTOR {
  const { routekey, websocketurl, channel, nick, password, handlers } = opts
  const channorm = normalizechannel(channel)
  const client = new IrcClientCtor()
  let registered = false
  let phase = 'connecting'

  const { host, port, path, tls } = parseircwebsocketurl(websocketurl)

  client.connect({
    host,
    port,
    path,
    tls,
    nick,
    username: nick,
    gecos: 'zss',
    auto_reconnect: false,
    password: password ?? undefined,
  })

  client.on('connected', () => {
    registered = true
    phase = 'connected'
    client.join(channorm)
    handlers.onconnect()
  })

  client.on('close', () => {
    registered = false
    phase = 'disconnected'
    handlers.ondisconnect()
  })

  client.on('socket error', (err: unknown) => {
    phase = 'error'
    handlers.onerror?.(err instanceof Error ? err.message : String(err))
  })

  client.on('message', (event: { type: string; target: string; nick: string; message: string }) => {
    if (!channorm || !event.nick) {
      return
    }
    const t = event.target.toLowerCase()
    if (t !== channorm.toLowerCase()) {
      return
    }
    if (event.type === 'privmsg' && ispresent(event.message)) {
      handlers.onmessage(routekey, 'message', event.nick, event.message)
    } else if (event.type === 'action' && ispresent(event.message)) {
      handlers.onmessage(routekey, 'action', event.nick, event.message)
    }
  })

  return {
    disconnect() {
      client.quit('zss bridge stop')
    },
    describestatus(): CHAT_CONNECTOR_STATUS {
      return {
        kind: CHAT_KIND.IRC,
        connected: registered,
        routekey,
        phase,
        detail: `${channorm} @ ${host}`,
      }
    },
  }
}
