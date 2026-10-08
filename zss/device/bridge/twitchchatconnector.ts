import {
  type AuthProvider,
  InvalidTokenError,
  getTokenInfo,
} from '@twurple/auth'
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
  onnotice?: (message: string) => void
  onerror?: (message: string) => void
}

/**
 * ChatClient only keeps InvalidTokenError. Any other throw from the provider
 * is replaced with "None of the queried intents (chat) are known".
 */
function tokenerror(detail: string): InvalidTokenError {
  const error = new InvalidTokenError()
  error.message = detail
  return error
}

/**
 * Gives ChatClient the oauth token without StaticAuthProvider's scope compare.
 * Twurple rejects a working tmi.js token when its scopes are not exactly
 * chat:read or chat:edit. Validate still runs so the login nick is known.
 */
function twitchchatauth(token: string): AuthProvider {
  return {
    clientId: '',
    getCurrentScopesForUser() {
      return ['chat:read', 'chat:edit']
    },
    async getAccessTokenForUser() {
      return this.getAccessTokenForIntent!('chat')
    },
    async getAnyAccessToken() {
      const tokeninfo = await this.getAccessTokenForIntent!('chat')
      if (!tokeninfo) {
        throw tokenerror('token has no twitch user')
      }
      return tokeninfo
    },
    async getAccessTokenForIntent() {
      let info
      try {
        info = await getTokenInfo(token)
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e)
        throw tokenerror(detail)
      }
      if (!info.userId || !info.userName) {
        throw tokenerror('token has no twitch user')
      }
      return {
        accessToken: token,
        refreshToken: null,
        scope: info.scopes,
        expiresIn: null,
        obtainmentTimestamp: Date.now(),
        userId: info.userId,
      }
    },
  }
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
        authProvider: twitchchatauth(trimmed),
      })
    : new ChatClient({ channels: [channel] })
  let connected = false
  let loggedin = false
  let username = ''

  function remembernick() {
    const nick = client.irc.currentNick
    if (nick) {
      username = nick
    }
  }

  function tapemessage(text: string): string {
    let out = ''
    for (let i = 0; i < text.length; ++i) {
      const c = text.charCodeAt(i)
      if (c >= 32 && c <= 126) {
        out += text[i]
      }
    }
    if (trimmed) {
      out = out.split(trimmed).join('***')
    }
    return out.trim()
  }

  function report(message: string) {
    const safe = tapemessage(message)
    if (safe) {
      handlers.onerror?.(safe)
    }
  }

  client.onConnect(() => {
    connected = true
    remembernick()
    handlers.onconnect(routekey)
  })
  client.onAuthenticationSuccess(() => {
    loggedin = true
    remembernick()
    handlers.onnotice?.(
      username
        ? `twitch chat logged in as ${username}`
        : 'twitch chat logged in',
    )
  })
  client.onTokenFetchFailure((error) => {
    report(`twitch chat token rejected: ${error.message}`)
  })
  client.onAuthenticationFailure((text, retrycount) => {
    report(`twitch chat login refused: ${text} (retry ${retrycount})`)
  })
  client.onDisconnect((manually, reason) => {
    connected = false
    if (!manually && reason) {
      report(`twitch chat dropped: ${reason.message}`)
    } else if (manually && !loggedin) {
      report('twitch chat closed before login finished')
    }
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
  client.connect()

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
