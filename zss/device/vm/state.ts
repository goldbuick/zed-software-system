/**
 * Shared mutable state used by VM message handlers.
 * Used by vm.ts and by handlers in vm/handlers/.
 */

export const SECOND_TIMEOUT = 16
export const FLUSH_RATE = 60

/** Wall-clock ms without `vm:acktick` before evicting a tick-confirmed runner. */
export const BOARDRUNNER_ACKTICK_STALE_MS = 2_000

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

// this tracks the last time a player input was received
export const lastinputtime: Record<string, number> = {}

// this tracks the keep alive ping from the player
// player -> keep alive ping
export const tracking: Record<string, number> = {}

// this signals active player ids
// player -> last log time
export const trackinglastlog: Record<string, number> = {}

/** Latest elected board runner per `BOARD.id` (main book); replaced each `second`. */
// board -> player
export const boardrunners: Record<string, string> = {}

// board runners that have been confirmed by `vm:acktick` (worker ran `boardrunner:tick` for this board)
// board -> last ack time
export const ackboardrunners: Record<string, number> = {}

// player -> skip flag
export const skipboardrunners: Record<string, boolean> = {}

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
