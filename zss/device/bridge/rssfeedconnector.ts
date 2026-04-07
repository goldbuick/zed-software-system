import { ispresent } from 'zss/mapping/types'

import type { CHAT_CONNECTOR, CHAT_CONNECTOR_STATUS } from './chatconnector'
import { CHAT_KIND } from './chattypes'
import type { TWITCH_CHAT_HANDLERS } from './twitchchatconnector'

export type RSS_FEED_OPTIONS = {
  routekey: string
  feedurl: string
  pollintervalms: number
  handlers: TWITCH_CHAT_HANDLERS
}

function textfromel(el: Element | null, selector: string) {
  const n = el?.querySelector(selector)
  return n?.textContent?.trim() ?? ''
}

function linkfromitem(item: Element) {
  const linkel = item.querySelector('link')
  const href = linkel?.getAttribute('href')?.trim()
  if (href) {
    return href
  }
  const guid = textfromel(item, 'guid')
  return guid || ''
}

function parseeachitems(
  doc: Document,
  seen: Set<string>,
  onitem: (id: string, title: string, link: string) => void,
) {
  const rssitems = doc.querySelectorAll('rss > channel > item, channel > item')
  if (rssitems.length > 0) {
    rssitems.forEach((item) => {
      const title = textfromel(item, 'title')
      const link = linkfromitem(item)
      const guid = textfromel(item, 'guid') || link || title
      if (!guid || seen.has(guid)) {
        return
      }
      seen.add(guid)
      onitem(guid, title, link)
    })
    return
  }
  const entries = doc.querySelectorAll('feed > entry, entry')
  entries.forEach((entry) => {
    const title = textfromel(entry, 'title')
    let link = ''
    const alt = entry.querySelector('link[rel="alternate"]')
    const h = alt?.getAttribute('href')?.trim()
    if (h) {
      link = h
    } else {
      const l = entry.querySelector('link')
      link = l?.getAttribute('href')?.trim() ?? ''
    }
    const id = textfromel(entry, 'id') || link || title
    if (!id || seen.has(id)) {
      return
    }
    seen.add(id)
    onitem(id, title, link)
  })
}

export function createrssfeedconnector(opts: RSS_FEED_OPTIONS): CHAT_CONNECTOR {
  const { routekey, feedurl, pollintervalms, handlers } = opts
  const seen = new Set<string>()
  let timer: ReturnType<typeof setInterval> | undefined
  let phase = 'idle'
  let lasterror = ''
  let firstpoll = true

  const poll = async () => {
    phase = 'polling'
    try {
      const res = await fetch(feedurl, { credentials: 'omit' })
      if (!res.ok) {
        throw new Error(`http ${res.status}`)
      }
      const text = await res.text()
      const doc = new DOMParser().parseFromString(text, 'application/xml')
      const parseerr = doc.querySelector('parsererror')
      if (ispresent(parseerr)) {
        throw new Error('xml parse failed')
      }
      const batch: { title: string; link: string }[] = []
      parseeachitems(doc, seen, (_id, title, link) => {
        batch.push({ title, link })
      })
      if (firstpoll) {
        firstpoll = false
        phase = 'live'
        handlers.onconnect(routekey)
      } else {
        for (let i = 0; i < batch.length; ++i) {
          const { title, link } = batch[i]
          const line = link ? `${title} ${link}` : title
          const author = title ? `rss:${title.slice(0, 80)}` : 'rss:item'
          handlers.onmessage(routekey, 'message', author, line || '(empty)')
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
        kind: CHAT_KIND.RSS,
        connected: phase === 'live' || phase === 'polling',
        routekey,
        phase,
        detail: lasterror ? `${feedurl} err=${lasterror}` : feedurl,
      }
    },
  }
}
