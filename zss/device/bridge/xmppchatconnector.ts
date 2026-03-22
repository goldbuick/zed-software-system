import { client as xmppcreate, xml } from '@xmpp/client'
import { ispresent } from 'zss/mapping/types'

import { CHAT_KIND } from './chattypes'
import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import type { TWITCH_CHAT_HANDLERS } from './twitchchatconnector'

export type XMPP_CONNECT_OPTIONS = {
  routekey: string
  service: string
  domain: string
  username: string
  password: string
  muc: string
  mucnick?: string
  handlers: TWITCH_CHAT_HANDLERS
}

export function createxmppchatconnector(opts: XMPP_CONNECT_OPTIONS): CHAT_CONNECTOR {
  const { routekey, service, domain, username, password, muc, mucnick, handlers } =
    opts
  const resource = `zss${Math.floor(Math.random() * 1e9)}`
  const xmpp = xmppcreate({
    service,
    domain,
    username,
    password,
    resource,
  })

  let online = false
  let phase = 'connecting'
  const mucbare = muc.split('/')[0] ?? muc
  const nick = mucnick ?? username

  xmpp.on('error', (err: unknown) => {
    phase = 'error'
    handlers.onerror?.(err instanceof Error ? err.message : String(err))
  })

  xmpp.on('online', () => {
    online = true
    phase = 'muc'
    void xmpp
      .send(
        xml(
          'presence',
          { to: `${mucbare}/${nick}` },
          xml('x', { xmlns: 'http://jabber.org/protocol/muc' }),
        ),
      )
      .catch(() => {
        phase = 'error'
      })
    handlers.onconnect()
  })

  xmpp.on('offline', () => {
    online = false
    phase = 'offline'
    handlers.ondisconnect()
  })

  xmpp.on('stanza', (stanzaunknown: unknown) => {
    const stanza = stanzaunknown as {
      is: (n: string) => boolean
      attrs: Record<string, string>
      getChildText?: (name: string) => string | undefined
    }
    if (!stanza.is('message')) {
      return
    }
    if (stanza.attrs.type !== 'groupchat') {
      return
    }
    const from = String(stanza.attrs.from ?? '')
    const bare = from.split('/')[0] ?? ''
    if (bare.toLowerCase() !== mucbare.toLowerCase()) {
      return
    }
    const body =
      typeof stanza.getChildText === 'function'
        ? stanza.getChildText('body')
        : undefined
    if (!ispresent(body) || body === '') {
      return
    }
    const slash = from.indexOf('/')
    const sender = slash >= 0 ? from.slice(slash + 1) : 'unknown'
    handlers.onmessage(routekey, 'message', sender, body)
  })

  void xmpp.start().catch(() => {
    phase = 'error'
  })

  return {
    disconnect() {
      void xmpp.stop().catch(noopstop)
      online = false
    },
    describestatus(): CHAT_CONNECTOR_STATUS {
      return {
        kind: CHAT_KIND.XMPP,
        connected: online,
        routekey,
        phase,
        detail: mucbare,
      }
    },
  }
}

function noopstop() {
  // xmpp stop may reject if already offline
}
