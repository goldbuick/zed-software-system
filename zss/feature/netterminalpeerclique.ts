import { parsetarget } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'

/** Max simultaneous join peers (not counting the host). */
export const NETTERMINAL_MAX_JOINS = 10

export type PEER_ROSTER_ENTRY = {
  player: string
  peerid: string
}

export type JOIN_ROUTE_KIND = 'local' | 'direct' | 'star'

export type JOIN_ROUTE =
  | { kind: 'local' }
  | { kind: 'direct'; peerid: string }
  | { kind: 'star' }

/**
 * Lexicographically lower peer id dials; higher waits on inbound `connection`.
 * Equal ids must not dial (same peer).
 */
export function shoulddialpeer(
  selfpeerid: string,
  otherpeerid: string,
): boolean {
  if (!selfpeerid || !otherpeerid || selfpeerid === otherpeerid) {
    return false
  }
  return selfpeerid < otherpeerid
}

/** Join-edge allowlist: boardrunner / chip only (not second/ready). */
export function shouldforwardonjoinedge(message: MESSAGE): boolean {
  const route = parsetarget(message.target)
  switch (route.target) {
    case 'chip':
    case 'boardrunner':
      return true
    default:
      return false
  }
}

export type RESOLVE_JOIN_ROUTE_INPUT = {
  message: MESSAGE
  selfpeerid: string
  hostpeerid: string
  /** player id -> peer id (joins + host) */
  playertopeer: Record<string, string>
  /** board id -> runner player id */
  boardtorunner: Record<string, string>
  /** player id -> board id */
  playertoboard: Record<string, string>
  /** peer ids with an open join-join DataConnection */
  openjoinpeers: ReadonlySet<string>
}

/**
 * Prefer direct join→join to the elected runner peer; XOR star fallback.
 * Unknown dest or missing edge -> star.
 */
export function resolvejoinroute(input: RESOLVE_JOIN_ROUTE_INPUT): JOIN_ROUTE {
  const {
    message,
    selfpeerid,
    hostpeerid,
    playertopeer,
    boardtorunner,
    playertoboard,
    openjoinpeers,
  } = input

  if (!shouldforwardonjoinedge(message)) {
    return { kind: 'star' }
  }

  const focusplayer = message.player
  const board = playertoboard[focusplayer]
  if (!board) {
    return { kind: 'star' }
  }
  const runnerplayer = boardtorunner[board]
  if (!runnerplayer) {
    return { kind: 'star' }
  }
  const runnerpeer = playertopeer[runnerplayer]
  if (!runnerpeer) {
    return { kind: 'star' }
  }

  if (runnerpeer === selfpeerid) {
    return { kind: 'local' }
  }
  if (runnerpeer === hostpeerid) {
    return { kind: 'star' }
  }
  if (openjoinpeers.has(runnerpeer)) {
    return { kind: 'direct', peerid: runnerpeer }
  }
  return { kind: 'star' }
}
