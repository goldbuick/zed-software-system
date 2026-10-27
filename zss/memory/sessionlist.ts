/** Sim-side copy of the main-thread session list (see zss/feature/sessionlist). */
import { getclimode } from 'zss/feature/detect'
import type { SESSIONLIST_ROW } from 'zss/feature/sessionlist/protocol'
import { isjoin } from 'zss/feature/url'
import { zsszedlinkline } from 'zss/feature/zsstextui'

let sessions: SESSIONLIST_ROW[] = []

export function memorywritesessionlist(next: SESSIONLIST_ROW[]) {
  sessions = next
}

export function memoryreadsessionlist(): SESSIONLIST_ROW[] {
  return sessions
}

/** Shared `#admin` / `#sessions` rows: one inline join link per session. */
export function memorysessionlistlines(): string[] {
  if (sessions.length === 0) {
    return ['no active games for this book']
  }
  const base = getclimode() && !isjoin() ? 'https://zed.cafe' : location.origin
  return sessions.map((entry) =>
    zsszedlinkline(
      `openit inline ${base}/join/#${entry.topic}`,
      `${entry.players} player${entry.players === 1 ? '' : 's'} $GREY${entry.topic}`,
    ),
  )
}
