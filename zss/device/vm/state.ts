/**
 * Shared mutable state used by VM message handlers.
 * Used by vm.ts and by handlers in vm/handlers/.
 */

export const SECOND_TIMEOUT = 16
export const FLUSH_RATE = 60

/** Seconds (1 `second` tick each) to wait for boardrunner ack before clearing election. */
export const BOARDRUNNER_ACK_FAIL_COUNT = 2

/**
 * Bias applied to a currently-acked board runner when deciding the next
 * election (see memoryreadboardrunnerchoices). A challenger must beat the
 * acked runner's tracking score by more than this to flip the election,
 * keeping ownership stable in the common case where a fresh joiner logs in
 * with initial tracking = SECOND_TIMEOUT/2.
 */
export const BOARDRUNNER_STICKY_BIAS = 4

/** Initial tracking score assigned on handlelogin/handlelocal. Set above 0
 * so a brand-new joiner does not instantly displace an acked runner whose
 * tracking is a few seconds old. Combined with BOARDRUNNER_STICKY_BIAS this
 * gives the existing runner a multi-tick stability window. */
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

// board runners that have acknowledged their election
export const ackboardrunners: Record<string, string> = {}

/** Per-board per-player ack retry count; `BOARDRUNNER_ACK_FAIL_COUNT` means failed (skip until valid ack). */
export const failedboardrunners: Record<string, Record<string, number>> = {}

/** Single acked board id for this player (sorted for stable pick if multiple). */
export function playerownedboard(player: string): string {
  const ids = Object.keys(ackboardrunners)
    .filter((bid) => ackboardrunners[bid] === player)
    .sort()
  return ids.length > 0 ? ids[0] : ''
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
