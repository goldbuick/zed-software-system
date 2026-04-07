import type { BRIDGE_CHAT_START_OBJECT } from 'zss/device/bridge/chattypes'
import { CHAT_KIND } from 'zss/device/bridge/chattypes'

export type KEYVAL_PARTITION = {
  positional: string[]
  kv: Record<string, string>
}

/** Split `key=value` tokens; first `=` separates key from value (value may contain `=`). */
export function partitionkeyvalwords(words: string[]): KEYVAL_PARTITION {
  const positional: string[] = []
  const kv: Record<string, string> = {}
  for (let i = 0; i < words.length; ++i) {
    const t = words[i]?.trim() ?? ''
    if (!t) {
      continue
    }
    const eq = t.indexOf('=')
    if (eq > 0) {
      const key = t.slice(0, eq).trim().toLowerCase()
      const val = t.slice(eq + 1)
      if (key) {
        kv[key] = val
      }
    } else {
      positional.push(t)
    }
  }
  return { positional, kv }
}

function kvget(kv: Record<string, string>, ...keys: string[]): string {
  for (let i = 0; i < keys.length; ++i) {
    const v = kv[keys[i]]
    if (v !== undefined && v !== '') {
      return v
    }
  }
  return ''
}

export function mergetostartobject(
  base: BRIDGE_CHAT_START_OBJECT,
  kv: Record<string, string>,
): BRIDGE_CHAT_START_OBJECT {
  const o = { ...base }
  const ostartrecord = o as Record<string, unknown>
  const assign = (field: keyof BRIDGE_CHAT_START_OBJECT, ...keys: string[]) => {
    const v = kvget(kv, ...keys)
    if (v !== '') {
      ostartrecord[field] = v
    }
  }
  assign('routekey', 'routekey', 'rk', 'key')
  assign('channel', 'channel', 'chan', 'ch')
  assign('feedurl', 'feedurl', 'url', 'feed')
  assign('mastodoninstance', 'mastodoninstance', 'instance', 'md_instance')
  assign('mastodonaccount', 'mastodonaccount', 'account', 'acct', 'md_account')
  assign('mastodonhashtag', 'mastodonhashtag', 'hashtag', 'tag')
  assign('mastodontoken', 'mastodontoken', 'token', 'md_token')
  assign('blueskyhandle', 'blueskyhandle', 'handle', 'bsky_handle')
  assign('blueskyfeeduri', 'blueskyfeeduri', 'feeduri', 'bsky_feed')
  assign(
    'blueskyapppassword',
    'blueskyapppassword',
    'apppassword',
    'bsky_app_pass',
  )

  const poll = kvget(kv, 'pollintervalsec', 'poll', 'interval')
  if (poll !== '') {
    const n = parseInt(poll, 10)
    if (Number.isFinite(n) && n > 0) {
      o.pollintervalsec = n
    }
  }
  return o
}

function twitchfrompositional(
  p: string[],
): BRIDGE_CHAT_START_OBJECT | undefined {
  const ch = p[0]?.trim()
  if (!ch) {
    return undefined
  }
  const rk = p[1]?.trim()
  if (rk) {
    return { kind: CHAT_KIND.TWITCH, routekey: rk, channel: ch }
  }
  return { kind: CHAT_KIND.TWITCH, routekey: ch, channel: ch }
}

function rssfrompositional(p: string[]): BRIDGE_CHAT_START_OBJECT | undefined {
  const routekey = p[0]?.trim()
  const feedurl = p[1]?.trim()
  const poll = p[2]?.trim()
  if (!routekey || !feedurl) {
    return undefined
  }
  const n = poll ? parseInt(poll, 10) : 120
  return {
    kind: CHAT_KIND.RSS,
    routekey,
    feedurl,
    pollintervalsec: Number.isFinite(n) && n > 0 ? n : 120,
  }
}

function mastodonfrompositional(
  p: string[],
): BRIDGE_CHAT_START_OBJECT | undefined {
  const routekey = p[0]?.trim()
  const instance = p[1]?.trim()
  const third = p[2]?.trim() ?? ''
  const token = p[3]?.trim()
  if (!routekey || !instance || !third) {
    return undefined
  }
  if (third.startsWith('#')) {
    return {
      kind: CHAT_KIND.MASTODON,
      routekey,
      mastodoninstance: instance,
      mastodonhashtag: third.replace(/^#+/, ''),
      ...(token ? { mastodontoken: token } : {}),
    }
  }
  return {
    kind: CHAT_KIND.MASTODON,
    routekey,
    mastodoninstance: instance,
    mastodonaccount: third,
    ...(token ? { mastodontoken: token } : {}),
  }
}

function blueskyfrompositional(
  p: string[],
): BRIDGE_CHAT_START_OBJECT | undefined {
  const routekey = p[0]?.trim()
  const handle = p[1]?.trim()
  const feeduri = p[2]?.trim()
  const apppassword = p[3]?.trim()
  if (!routekey || !handle) {
    return undefined
  }
  return {
    kind: CHAT_KIND.BLUESKY,
    routekey,
    blueskyhandle: handle,
    ...(feeduri ? { blueskyfeeduri: feeduri } : {}),
    ...(apppassword ? { blueskyapppassword: apppassword } : {}),
  }
}

/** Build start object from positional + kv for a known kind (after profile merge). */
export function buildchatstartforkind(
  kind: BRIDGE_CHAT_START_OBJECT['kind'],
  wordsafterkind: string[],
): BRIDGE_CHAT_START_OBJECT | undefined {
  const { positional, kv } = partitionkeyvalwords(wordsafterkind)

  let base: BRIDGE_CHAT_START_OBJECT | undefined
  switch (kind) {
    case CHAT_KIND.TWITCH:
      base = twitchfrompositional(positional)
      break
    case CHAT_KIND.RSS: {
      base = rssfrompositional(positional)
      if (!base) {
        const routekey =
          kvget(kv, 'routekey', 'rk') || positional[0]?.trim() || ''
        const feedurl =
          kvget(kv, 'feedurl', 'url', 'feed') || positional[1]?.trim() || ''
        const polltext =
          kvget(kv, 'pollintervalsec', 'poll', 'interval') ||
          positional[2]?.trim() ||
          ''
        const poll = polltext ? parseInt(polltext, 10) : 120
        if (routekey && feedurl) {
          base = {
            kind: CHAT_KIND.RSS,
            routekey,
            feedurl,
            pollintervalsec: Number.isFinite(poll) && poll > 0 ? poll : 120,
          }
        }
      }
      break
    }
    case CHAT_KIND.MASTODON: {
      base = mastodonfrompositional(positional)
      if (!base) {
        const routekey =
          kvget(kv, 'routekey', 'rk') || positional[0]?.trim() || ''
        const instance =
          kvget(kv, 'mastodoninstance', 'instance', 'md_instance') ||
          positional[1]?.trim() ||
          ''
        const account =
          kvget(kv, 'mastodonaccount', 'account', 'acct', 'md_account') ||
          positional[2]?.trim() ||
          ''
        const token =
          kvget(kv, 'mastodontoken', 'token', 'md_token') ||
          positional[3]?.trim() ||
          ''
        const hashtag = kvget(kv, 'mastodonhashtag', 'hashtag', 'tag') || ''
        if (routekey && instance && (account || hashtag)) {
          base = {
            kind: CHAT_KIND.MASTODON,
            routekey,
            mastodoninstance: instance,
            ...(hashtag
              ? { mastodonhashtag: hashtag.replace(/^#/, '') }
              : { mastodonaccount: account }),
            ...(token ? { mastodontoken: token } : {}),
          }
        }
      }
      break
    }
    case CHAT_KIND.BLUESKY: {
      base = blueskyfrompositional(positional)
      if (!base) {
        const routekey =
          kvget(kv, 'routekey', 'rk') || positional[0]?.trim() || ''
        const handle =
          kvget(kv, 'blueskyhandle', 'handle', 'bsky_handle') ||
          positional[1]?.trim() ||
          ''
        const feeduri =
          kvget(kv, 'blueskyfeeduri', 'feeduri', 'bsky_feed') ||
          positional[2]?.trim() ||
          ''
        const apppassword =
          kvget(kv, 'blueskyapppassword', 'apppassword', 'bsky_app_pass') ||
          positional[3]?.trim() ||
          ''
        if (routekey && handle) {
          base = {
            kind: CHAT_KIND.BLUESKY,
            routekey,
            blueskyhandle: handle,
            ...(feeduri ? { blueskyfeeduri: feeduri } : {}),
            ...(apppassword ? { blueskyapppassword: apppassword } : {}),
          }
        }
      }
      break
    }
    default:
      return undefined
  }

  if (!base) {
    return undefined
  }
  return mergetostartobject(base, kv)
}

export function profilenamefromtoken(token: string): string | undefined {
  const t = token.trim()
  if (t.startsWith('@')) {
    const n = t.slice(1).trim()
    return n || undefined
  }
  return undefined
}

/** Resolve start object: `@profile` + optional key=value overrides, or full positional/kv parse. */
export function resolvechatstartwords(
  kind: CHAT_KIND,
  wordsafterkind: string[],
  profiles: Record<string, BRIDGE_CHAT_START_OBJECT>,
):
  | { ok: true; payload: BRIDGE_CHAT_START_OBJECT }
  | { ok: false; reason: string } {
  const first = wordsafterkind[0]?.trim() ?? ''
  const pn = profilenamefromtoken(first)
  if (pn) {
    const prof = profiles[pn]
    if (!prof) {
      return { ok: false, reason: `unknown bridge profile @${pn}` }
    }
    if (prof.kind !== kind) {
      return {
        ok: false,
        reason: `profile @${pn} is ${prof.kind}, not ${kind}`,
      }
    }
    const { kv } = partitionkeyvalwords(wordsafterkind.slice(1))
    return { ok: true, payload: mergetostartobject({ ...prof }, kv) }
  }
  const built = buildchatstartforkind(kind, wordsafterkind)
  if (!built) {
    return { ok: false, reason: 'missing or invalid fields for this chat kind' }
  }
  return { ok: true, payload: built }
}
