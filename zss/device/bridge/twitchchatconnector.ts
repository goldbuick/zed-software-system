import { StaticAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'

import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import { CHAT_KIND } from './chattypes'
import { striptext } from './twitchchatstrip'

export type TWITCH_CHAT_HANDLERS = {
  onconnect: (routekey: string) => void
  ondisconnect: (routekey: string) => void
  onmessage: (
    routekey: string,
    mode: 'message' | 'action',
    user: string,
    text: string,
  ) => void
  onerror?: (message: string) => void
}

export function createtwitchchatconnector(
  routekey: string,
  channel: string,
  handlers: TWITCH_CHAT_HANDLERS,
  token?: string,
): CHAT_CONNECTOR {
  const trimmed = token?.trim() ?? ''
  const canspeak = trimmed !== ''
  const client = canspeak
    ? new ChatClient({
        channels: [channel],
        authProvider: new StaticAuthProvider('', trimmed),
      })
    : new ChatClient({ channels: [channel] })
  let connected = false
  let username = ''

  function remembernick() {
    const nick = client.irc.currentNick
    if (nick) {
      username = nick
    }
  }

  client.connect()
  client.onConnect(() => {
    connected = true
    remembernick()
    handlers.onconnect(routekey)
  })
  client.onAuthenticationSuccess(() => {
    remembernick()
  })
  client.onDisconnect(() => {
    connected = false
    handlers.ondisconnect(routekey)
  })
  client.onMessage((_, user, __, msg) => {
    const simpletext = striptext(msg)
    handlers.onmessage(routekey, 'message', user, simpletext)
  })
  client.onAction((_, user, __, msg) => {
    const simpletext = striptext(msg)
    handlers.onmessage(routekey, 'action', user, simpletext)
  })

  return {
    disconnect() {
      client.quit()
    },
    canspeak() {
      return canspeak
    },
    say(text: string) {
      if (!canspeak) {
        return Promise.reject(new Error('twitch chat cannot speak'))
      }
      return client.say(channel, text)
    },
    describestatus(): CHAT_CONNECTOR_STATUS {
      return {
        kind: CHAT_KIND.TWITCH,
        connected,
        routekey,
        detail: channel,
        username,
      }
    },
  }
}
