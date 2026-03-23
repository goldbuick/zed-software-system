import { MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

export const CHAT_KIND = {
  TWITCH: 'twitch',
  IRC: 'irc',
  XMPP: 'xmpp',
  RSS: 'rss',
  MASTODON: 'mastodon',
  BLUESKY: 'bluesky',
} as const

export type CHAT_KIND = (typeof CHAT_KIND)[keyof typeof CHAT_KIND]

export const ALL_CHAT_KINDS: CHAT_KIND[] = [
  CHAT_KIND.TWITCH,
  CHAT_KIND.IRC,
  CHAT_KIND.XMPP,
  CHAT_KIND.RSS,
  CHAT_KIND.MASTODON,
  CHAT_KIND.BLUESKY,
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
  /** RSS / Atom feed (browser fetch; URL must allow CORS or be same-origin) */
  feedurl?: string
  /** Poll interval seconds (default 120) */
  pollintervalsec?: number
  /** Mastodon: instance origin e.g. https://mastodon.social */
  mastodoninstance?: string
  /** Mastodon: @user or user (no @) */
  mastodonaccount?: string
  /** Mastodon: hashtag without # (timeline); alternative to account */
  mastodonhashtag?: string
  /** Mastodon: OAuth token for authenticated timelines */
  mastodontoken?: string
  /** Bluesky: handle or DID */
  blueskyhandle?: string
  /** Bluesky: at://… feed generator URI (optional; default author feed) */
  blueskyfeeduri?: string
  /** Bluesky: app password (optional; reserved for authenticated flows) */
  blueskyapppassword?: string
}

export type BRIDGE_CHAT_START_PAYLOAD = string | BRIDGE_CHAT_START_OBJECT

export function normalizechatkind(value: string): MAYBE<CHAT_KIND> {
  const n = NAME(value)
  if (
    n === CHAT_KIND.TWITCH ||
    n === CHAT_KIND.IRC ||
    n === CHAT_KIND.XMPP ||
    n === CHAT_KIND.RSS ||
    n === CHAT_KIND.MASTODON ||
    n === CHAT_KIND.BLUESKY
  ) {
    return n
  }
  return undefined
}

export function parsechatstartpayload(
  data: unknown,
): MAYBE<BRIDGE_CHAT_START_OBJECT> {
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
  const rawkind = o.kind
  const kindtext =
    typeof rawkind === 'string'
      ? rawkind
      : typeof rawkind === 'number' && Number.isFinite(rawkind)
        ? String(rawkind)
        : ''
  const kind = normalizechatkind(kindtext)
  const routekey = typeof o.routekey === 'string' ? o.routekey.trim() : ''
  if (!kind || !routekey) {
    return undefined
  }
  const pollraw = o.pollintervalsec
  let pollintervalsec: number | undefined
  if (typeof pollraw === 'number' && Number.isFinite(pollraw)) {
    pollintervalsec = pollraw
  } else if (typeof pollraw === 'string' && pollraw.trim()) {
    const p = parseInt(pollraw, 10)
    if (Number.isFinite(p)) {
      pollintervalsec = p
    }
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
    feedurl: typeof o.feedurl === 'string' ? o.feedurl.trim() : undefined,
    pollintervalsec,
    mastodoninstance:
      typeof o.mastodoninstance === 'string'
        ? o.mastodoninstance.trim()
        : undefined,
    mastodonaccount:
      typeof o.mastodonaccount === 'string'
        ? o.mastodonaccount.trim()
        : undefined,
    mastodonhashtag:
      typeof o.mastodonhashtag === 'string'
        ? o.mastodonhashtag.trim()
        : undefined,
    mastodontoken:
      typeof o.mastodontoken === 'string' ? o.mastodontoken : undefined,
    blueskyhandle:
      typeof o.blueskyhandle === 'string' ? o.blueskyhandle.trim() : undefined,
    blueskyfeeduri:
      typeof o.blueskyfeeduri === 'string'
        ? o.blueskyfeeduri.trim()
        : undefined,
    blueskyapppassword:
      typeof o.blueskyapppassword === 'string'
        ? o.blueskyapppassword
        : undefined,
  }
}
