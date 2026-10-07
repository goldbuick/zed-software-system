import type { MEDIAQUEUE_STATE } from 'zss/feature/mediaqueue/queue'

function durationlabel(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) {
    return 'unknown'
  }
  const mins = Math.max(1, Math.round(sec / 60))
  return `${mins}m`
}

function asciifield(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; ++i) {
    const c = value.charCodeAt(i)
    if (c >= 32 && c <= 126) {
      out += value[i]
    }
  }
  return out.trim()
}

/** Approval rows: `index duration name title`. */
export function mediaqueueflaglines(state: MEDIAQUEUE_STATE): string[] {
  const rows: string[] = []
  for (let i = 0; i < state.pendingurls.length; ++i) {
    const who = asciifield(state.pendingnames[i] ?? '') || '?'
    const title =
      asciifield(state.pendingtitles[i] ?? '') ||
      asciifield(state.pendingurls[i] ?? '')
    const dur = durationlabel(state.pendingdurations[i] ?? 0)
    rows.push(`${i} ${dur} ${who} ${title}`.trim())
  }
  return rows
}

/** Play-queue rows: `index name title`. */
export function medialistflaglines(state: MEDIAQUEUE_STATE): string[] {
  const rows: string[] = []
  for (let i = 0; i < state.urls.length; ++i) {
    const who = asciifield(state.names[i] ?? '') || '?'
    const title =
      asciifield(state.titles[i] ?? '') || asciifield(state.urls[i] ?? '')
    rows.push(`${i} ${who} ${title}`.trim())
  }
  return rows
}
