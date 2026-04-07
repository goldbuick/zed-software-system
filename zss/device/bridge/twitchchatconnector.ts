import { ChatClient, ChatMessage } from '@twurple/chat'
import { ispresent } from 'zss/mapping/types'

import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import { CHAT_KIND } from './chattypes'

function removeurls(text: string) {
  const urlregex = /(?:https?|ftp):\/\/[\n\S]+/g
  return text.replace(urlregex, '')
}

function striptext(msg: ChatMessage) {
  let plaintext = msg.text
  const ranges = [...msg.emoteOffsets.values()]
  for (let r = 0; r < ranges.length; ++r) {
    const indexes = ranges[r].reverse()
    for (let i = 0; i < indexes.length; ++i) {
      const [start, end] = indexes[i].split('-').map(parseFloat)
      plaintext = plaintext.substring(0, start) + plaintext.substring(end + 1)
    }
  }
  return removeurls(plaintext)
}

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
