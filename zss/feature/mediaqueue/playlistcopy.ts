import type { MEDIAQUEUE_STATE } from 'zss/feature/mediaqueue/queue'
import { mediaqueuenormalizeurl } from 'zss/feature/mediaqueue/urlnormalize'

export type MEDIAQUEUE_CLIP_ITEM = {
  submittedat: number
  title: string
  name: string
  url: string
}

function onelinespaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function mediaqueueclipsubmittedat(ms: number): string {
  const date = new Date(ms)
  if (!Number.isFinite(ms) || Number.isNaN(date.getTime())) {
    return 'unknown'
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function mediaqueuecliponeline(item: MEDIAQUEUE_CLIP_ITEM): string {
  const title =
    onelinespaces(item.title) || onelinespaces(item.name) || 'untitled'
  const url = onelinespaces(item.url)
  return `${mediaqueueclipsubmittedat(item.submittedat)} ${title} ${url}`
}

export function mediaqueuecliplines(items: MEDIAQUEUE_CLIP_ITEM[]): string {
  const lines: string[] = []
  for (let i = 0; i < items.length; ++i) {
    lines.push(mediaqueuecliponeline(items[i]))
  }
  return lines.join('\n')
}

export function mediaqueueclipitemsfromstate(
  state: MEDIAQUEUE_STATE,
): MEDIAQUEUE_CLIP_ITEM[] {
  const items: MEDIAQUEUE_CLIP_ITEM[] = []
  const seen = new Set<string>()
  function pushitem(item: MEDIAQUEUE_CLIP_ITEM) {
    const key = mediaqueuenormalizeurl(item.url)
    if (!item.url || seen.has(key)) {
      return
    }
    seen.add(key)
    items.push(item)
  }
  for (let i = 0; i < state.playedurls.length; ++i) {
    pushitem({
      submittedat: state.playedsubmittedats[i],
      title: state.playedtitles[i] || '',
      name: state.playednames[i] || '',
      url: state.playedurls[i],
    })
  }
  for (let i = 0; i < state.urls.length; ++i) {
    pushitem({
      submittedat: state.submittedats[i],
      title: state.titles[i] || '',
      name: state.names[i] || '',
      url: state.urls[i],
    })
  }
  return items
}
