import { ChatClient } from '@twurple/chat'
import { ispresent } from 'zss/mapping/types'

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
): CHAT_CONNECTOR {
  const client = new ChatClient({ channels: [channel] })
  let connected = false

  client.connect()
  client.onConnect(() => {
    connected = true
    handlers.onconnect(routekey)
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
    describestatus(): CHAT_CONNECTOR_STATUS {
      return {
        kind: CHAT_KIND.TWITCH,
        connected,
        routekey,
        detail: ispresent(client) ? channel : undefined,
      }
    },
  }
}
