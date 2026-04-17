/**
 * Shared mutable state used by VM message handlers.
 * Used by vm.ts and by handlers in vm/handlers/.
 */

export const SECOND_TIMEOUT = 16
export const FLUSH_RATE = 60
export const BOARDRUNNER_ACK_FAIL_COUNT = 2

export const tracking: Record<string, number> = {}
export const trackinglastlog: Record<string, number> = {}
export const lastinputtime: Record<string, number> = {}

/** Latest elected board runner per `BOARD.id` (main book); replaced each `second`. */
export const boardrunners: Record<string, string> = {}
// board runners that have acknowledged their election
export const ackboardrunners: Record<string, string> = {}
/** Per-board per-player ack retry count; `BOARDRUNNER_ACK_FAIL_COUNT` means failed (skip until valid ack). */
export const failedboardrunners: Record<string, Record<string, number>> = {}

/**
 * True when a worker has acknowledged it owns the per-tick simulation of the
 * given board. Phase 2 of the boardrunner authoritative-tick plan stops the
 * server from ticking owned boards; remaining server-side code paths (e.g.
 * the Phase 3 cross-board transfer mediator) consult this helper to know
 * whether they may mutate a board directly or must instead route the change
 * through the elected runner.
 */
export function boardisowned(boardid: string): boolean {
  if (!boardid) {
    return false
  }
  const owner = ackboardrunners[boardid]
  return typeof owner === 'string' && owner.length > 0
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
