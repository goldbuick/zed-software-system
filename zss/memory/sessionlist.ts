/** Sim-side copy of the main-thread session list (see zss/feature/sessionlist). */
import { getclimode } from 'zss/feature/detect'
import type { SESSIONLIST_ROW } from 'zss/feature/sessionlist/protocol'
import { isjoin } from 'zss/feature/url'
import { DIVIDER, zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

let sessions: SESSIONLIST_ROW[] = []

export function memorywritesessionlist(next: SESSIONLIST_ROW[]) {
  sessions = next
}

export function memoryreadsessionlist(): SESSIONLIST_ROW[] {
  return sessions
}

function sessionlistlabel(entry: SESSIONLIST_ROW): string {
  const count = `${entry.players} player${entry.players === 1 ? '' : 's'}`
  const topic = `$GREY${entry.topic}`
  if (entry.name) {
    return `${count}  ${topic}  ${entry.name}`
  }
  return `${count}  ${topic}`
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
      sessionlistlabel(entry),
    ),
  )
}

/** Admin-style scroll of active games (`cpu #sessions`). */
export function memoryopensessionlistscroll(player: string) {
  scrollwritelines(
    player,
    'cpu #sessions',
    zsstexttape('join active games', DIVIDER, memorysessionlistlines()),
    'refscroll',
  )
}
