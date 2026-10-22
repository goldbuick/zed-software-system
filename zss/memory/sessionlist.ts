/** Sim-side copy of the main-thread session list (see zss/feature/sessionlist). */
import type { SESSIONLIST_ROW } from 'zss/feature/sessionlist/protocol'
import { zsszedlinklinechip } from 'zss/feature/zsstextui'

let sessions: SESSIONLIST_ROW[] = []

export function memorywritesessionlist(next: SESSIONLIST_ROW[]) {
  sessions = next
}

export function memoryreadsessionlist(): SESSIONLIST_ROW[] {
  return sessions
}

/** Shared `#admin` / `#sessions` rows: one soft-join link per session. */
export function memorysessionlistlines(): string[] {
  if (sessions.length === 0) {
    return ['no active sessions for this book']
  }
  return sessions.map((entry) =>
    zsszedlinklinechip(
      'adminjoin',
      entry.topic,
      `${entry.players} player${entry.players === 1 ? '' : 's'} $GREY${entry.topic}`,
    ),
  )
}
