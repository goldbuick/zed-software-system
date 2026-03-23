import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import { CHAT_KIND } from './chattypes'
import type { TWITCH_CHAT_HANDLERS } from './twitchchatconnector'

export type MASTODON_FEED_OPTIONS = {
  routekey: string
  instanceorigin: string
  /** hashtag without #, or empty if using account */
  hashtag: string
  /** local or full user@domain */
  account: string
  accesstoken?: string
  pollintervalms: number
  handlers: TWITCH_CHAT_HANDLERS
}

function normalizeinstance(s: string) {
  const t = s.trim().replace(/\/$/, '')
  if (!t.startsWith('http://') && !t.startsWith('https://')) {
    return `https://${t}`
  }
  return t
}

function stripacct(a: string) {
  const t = a.trim().replace(/^@+/, '')
  return t
}

export function createmastodonfeedconnector(
  opts: MASTODON_FEED_OPTIONS,
): CHAT_CONNECTOR {
  const {
    routekey,
    instanceorigin,
    hashtag,
    account,
    accesstoken,
    pollintervalms,
    handlers,
  } = opts
  const base = normalizeinstance(instanceorigin)
  const seen = new Set<string>()
  let timer: ReturnType<typeof setInterval> | undefined
  let phase = 'idle'
  let lasterror = ''
  let firstpoll = true
  let accountid: string | undefined

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (accesstoken) {
    headers.Authorization = `Bearer ${accesstoken}`
  }

  const resolveaccountid = async (): Promise<string | undefined> => {
    if (accountid) {
      return accountid
    }
    const acct = stripacct(account)
    if (!acct) {
      return undefined
    }
    const url = `${base}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`
    const res = await fetch(url, { headers, credentials: 'omit' })
    if (!res.ok) {
      throw new Error(`mastodon lookup ${res.status}`)
    }
    const j = (await res.json()) as { id?: string }
    if (typeof j.id === 'string') {
      accountid = j.id
      return accountid
    }
    return undefined
  }

  const poll = async () => {
    phase = 'polling'
    try {
      let url = ''
      if (hashtag) {
        url = `${base}/api/v1/timelines/tag/${encodeURIComponent(hashtag)}?limit=20`
      } else {
        const id = await resolveaccountid()
        if (!id) {
          throw new Error('mastodon account not resolved')
        }
        url = `${base}/api/v1/accounts/${id}/statuses?limit=20`
      }
      const res = await fetch(url, { headers, credentials: 'omit' })
      if (!res.ok) {
        throw new Error(`mastodon ${res.status}`)
      }
      const list = (await res.json()) as {
        id?: string
        uri?: string
        content?: string
        account?: { acct?: string; username?: string }
      }[]
      if (!Array.isArray(list)) {
        throw new Error('mastodon bad json')
      }
      const batch: { id: string; acct: string; text: string }[] = []
      for (let i = list.length - 1; i >= 0; --i) {
        const st = list[i]
        const id = String(st.id ?? st.uri ?? '')
        if (!id || seen.has(id)) {
          continue
        }
        seen.add(id)
        const raw = st.content ?? ''
        const text = raw
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        const acct = st.account?.acct ?? st.account?.username ?? 'mastodon'
        batch.push({ id, acct, text })
      }
      if (firstpoll) {
        firstpoll = false
        phase = 'live'
        handlers.onconnect()
      } else {
        for (let i = 0; i < batch.length; ++i) {
          const { acct, text } = batch[i]
          handlers.onmessage(
            routekey,
            'message',
            `mastodon:${acct}`,
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
      handlers.ondisconnect()
    },
    describestatus(): CHAT_CONNECTOR_STATUS {
      return {
        kind: CHAT_KIND.MASTODON,
        connected: phase === 'live' || phase === 'polling',
        routekey,
        phase,
        detail: lasterror
          ? `${base} err=${lasterror}`
          : hashtag
            ? `#${hashtag}`
            : account,
      }
    },
  }
}
