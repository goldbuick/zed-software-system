/**
 * Shared mutable state used by VM message handlers.
 * Used by vm.ts and by handlers in vm/handlers/.
 */

export const SECOND_TIMEOUT = 16
export const FLUSH_RATE = 60

/** Seconds (1 `second` tick each) to wait for tick confirmation before clearing election. */
export const BOARDRUNNER_ACK_FAIL_COUNT = 2

/** Wall-clock ms without `vm:acktick` before evicting a tick-confirmed runner. */
export const BOARDRUNNER_ACKTICK_STALE_MS = 10_000

/** Initial tracking score assigned on handlelogin/handlelocal. Set above 0
 * so a brand-new joiner is not treated as the most-active candidate the
 * instant they land (see `memoryreadboardrunnerchoices` defaults). */
export const INITIAL_TRACKING = 8

/**
 * `handlesecond` calls `vmlogout` when `tracking[player]` reaches this value
 * (increments once per host sim second; `vm:doot` resets to 0). The host keeps
 * ticking even when a joiner's tab is throttled, so `doot` can lag many real
 * seconds — `SECOND_TIMEOUT + INITIAL_TRACKING` (~24) was still too tight in
 * practice. Use an absolute multi-second floor independent of election bias.
 */
export const IDLE_LOGOUT_TRACKING = SECOND_TIMEOUT * 3

export const tracking: Record<string, number> = {}
export const trackinglastlog: Record<string, number> = {}
export const lastinputtime: Record<string, number> = {}

/** Latest elected board runner per `BOARD.id` (main book); replaced each `second`. */
export const boardrunners: Record<string, string> = {}

// board runners confirmed by `vm:acktick` (worker ran `boardrunner:tick` for this board)
export const ackboardrunners: Record<string, string> = {}

/** Last `Date.now()` we saw `vm:acktick` for this board (tick-proven runner only). */
export const boardrunnerlastacktickat: Record<string, number> = {}

export function clearboardrunnerlastacktick(boardid: string): void {
  delete boardrunnerlastacktickat[boardid]
}

/**
 * Per-board per-player retry count while elected but not yet tick-confirmed.
 * Value `BOARDRUNNER_ACK_FAIL_COUNT` means exclusion until peergone, logout,
 * board move, or successful `vm:acktick` clears the entry.
 */
export const failedboardrunners: Record<string, Record<string, number>> = {}

/** Single acked board id for this player (sorted for stable pick if multiple). */
export function playerownedboard(player: string): string {
  const ids = Object.keys(ackboardrunners)
    .filter((bid) => ackboardrunners[bid] === player)
    .sort()
  return ids.length > 0 ? ids[0] : ''
}

/**
 * Board id for `boardrunner:ownedboard` on the worker: any board where this
 * player is the elected runner (possibly awaiting ack) or the acked runner.
 * Pending-only ownership must still hydrate the worker; `playerownedboard`
 * is ack-only and would leave `assignedboard` empty until ack.
 */
export function playerboardrunnerowntarget(player: string): string {
  const ids = new Set<string>()
  for (const bid of Object.keys(boardrunners)) {
    if (boardrunners[bid] === player) {
      ids.add(bid)
    }
  }
  for (const bid of Object.keys(ackboardrunners)) {
    if (ackboardrunners[bid] === player) {
      ids.add(bid)
    }
  }
  const sorted = [...ids].sort()
  return sorted.length > 0 ? sorted[0] : ''
}

let flushtick = 0
export function getflushtick(): number {
  return flushtick
}

export function setflushtick(value: number): void {
  flushtick = value
}

export function incflushtick(): number {
  return ++flushtick
}

export const watching: Record<string, Set<string>> = {}
export const observers: Record<string, (() => void) | undefined> = {}

export const STATS_BOARD = [
  'currenttick',
  'boardid',
  'isdark',
  'notdark',
  'startx',
  'starty',
  'over',
  'under',
  'camera',
  'graphics',
  'charset',
  'palette',
  'facing',
  'exitnorth',
  'exitsouth',
  'exitwest',
  'exiteast',
  'timelimit',
  'restartonzap',
  'norestartonzap',
  'maxplayershots',
  'b1',
  'b2',
  'b3',
  'b4',
  'b5',
  'b6',
  'b7',
  'b8',
  'b9',
  'b10',
]

export const STATS_HELPER = [
  'playerid',
  'playerx',
  'playery',
  'thisid',
  'thisx',
  'thisy',
]

export const STATS_SENDER = ['senderid', 'senderx', 'sendery']

export const STATS_INTERACTION = [
  'item',
  'group',
  'party',
  'player',
  'pushable',
  'collision',
  'breakable',
]

export const STATS_BOOLEAN = [
  'ispushable',
  'notpushable',
  'iswalk',
  'iswalking',
  'iswalkable',
  'isswim',
  'isswimming',
  'isswimable',
  'issolid',
  'isbullet',
  'isghost',
  'isbreakable',
  'notbreakable',
]

export const STATS_CONFIG = [
  'arg',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'p9',
  'p10',
  'cycle',
  'stepx',
  'stepy',
  'shootx',
  'shooty',
  'light',
  'lightdir',
]
