import { ispresent } from 'zss/mapping/types'

import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import { CHAT_KIND } from './chattypes'
import type { TWITCH_CHAT_HANDLERS } from './twitchchatconnector'

const PUBLIC_BSKY = 'https://public.api.bsky.app'

export type BLUESKY_FEED_OPTIONS = {
  routekey: string
  handle: string
  /** at://… feed URI; if empty, use author feed */
  feeduri?: string
  pollintervalms: number
  handlers: TWITCH_CHAT_HANDLERS
}

type BskyPost = {
  uri?: string
  record?: { text?: string; createdAt?: string }
  author?: { handle?: string; displayName?: string }
}

type BskyFeedResp = { feed?: { post?: BskyPost }[]; cursor?: string }

function posttext(p: BskyPost) {
  const t = p.record?.text
  return typeof t === 'string' ? t.trim() : ''
}

export function createblueskyfeedconnector(
  opts: BLUESKY_FEED_OPTIONS,
): CHAT_CONNECTOR {
  const { routekey, handle, feeduri, pollintervalms, handlers } = opts
  const seen = new Set<string>()
  let timer: ReturnType<typeof setInterval> | undefined
  let phase = 'idle'
  let lasterror = ''
  let firstpoll = true
  let cursor: string | undefined

  const poll = async () => {
    phase = 'polling'
    try {
      let url = ''
      if (feeduri?.startsWith('at://')) {
        const u = new URL('/xrpc/app.bsky.feed.getFeed', PUBLIC_BSKY)
        u.searchParams.set('feed', feeduri)
        u.searchParams.set('limit', '20')
        if (cursor) {
          u.searchParams.set('cursor', cursor)
        }
        url = u.href
      } else {
        const u = new URL('/xrpc/app.bsky.feed.getAuthorFeed', PUBLIC_BSKY)
        u.searchParams.set('actor', handle.trim())
        u.searchParams.set('limit', '20')
        if (cursor) {
          u.searchParams.set('cursor', cursor)
        }
        url = u.href
      }
      const res = await fetch(url, { credentials: 'omit' })
      if (!res.ok) {
        throw new Error(`bluesky ${res.status}`)
      }
      const data = (await res.json()) as BskyFeedResp
      const feed = data.feed
      if (!Array.isArray(feed)) {
        throw new Error('bluesky bad json')
      }
      if (ispresent(data.cursor)) {
        cursor = data.cursor
      }
      const batch: { uri: string; handle: string; text: string }[] = []
      for (let i = feed.length - 1; i >= 0; --i) {
        const post = feed[i]?.post
        if (!post) {
          continue
        }
        const uri = String(post.uri ?? '')
        if (!uri || seen.has(uri)) {
          continue
        }
        seen.add(uri)
        const h = post.author?.handle ?? 'unknown'
        const text = posttext(post)
        batch.push({ uri, handle: h, text })
      }
      if (firstpoll) {
        firstpoll = false
        phase = 'live'
        handlers.onconnect(routekey)
      } else {
        for (let i = 0; i < batch.length; ++i) {
          const { handle: h, text } = batch[i]
          handlers.onmessage(
            routekey,
            'message',
            `bluesky:${h}`,
            text || '(empty)',
          )
        }
      }
      phase = 'live'
      lasterror = ''
    } catch (e) {
      phase = 'error'
      lasterror = e instanceof Error ? e.message : String(e)
      handlers.onerror?.(lasterror)
    }
  }

  void poll()
  timer = setInterval(() => {
    void poll()
  }, pollintervalms)

  return {
    disconnect() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
      handlers.ondisconnect(routekey)
    },
    describestatus(): CHAT_CONNECTOR_STATUS {
      return {
        kind: CHAT_KIND.BLUESKY,
        connected: phase === 'live' || phase === 'polling',
        routekey,
        phase,
        detail: lasterror
          ? `${handle} err=${lasterror}`
          : feeduri && feeduri !== ''
            ? feeduri
            : handle,
      }
    },
  }
}
