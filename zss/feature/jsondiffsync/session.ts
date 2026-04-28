import { deepcopy } from 'zss/mapping/types'

import type { JSON_DOCUMENT } from './types'

/**
 * Leaf (or any peer in a single hub session).
 *
 * Outbound ops = compare(shadow, working). Shadow advances only after the counterparty acks our
 * seq; until then we retransmit a cumulative delta (Fraser guaranteed delivery).
 */
export type LEAF_SESSION = {
  peer: string
  working: JSON_DOCUMENT
  shadow: JSON_DOCUMENT
  backupshadow: JSON_DOCUMENT | undefined
  /** Aligned with hub leaf row / hub.document_version after last successful exchange. */
  basisversion: number
  nextseq: number
  unackedseq: number | undefined
  /** Incremented on each prepareoutbound while unacked; used to mark retransmits. */
  unackedpreparecount: number
  lastpeerseqacked: number
  /** Highest hub seq reflected in leaf→hub `ack_peer_seq` (for ack-only sends). */
  lastackpiggybackedtohub: number
}

export type HUB_LEAF_RECORD = {
  basisversion: number
  shadow: JSON_DOCUMENT
}

export type HUB_SESSION = {
  working: JSON_DOCUMENT
  documentversion: number
  leaves: Map<string, HUB_LEAF_RECORD>
  nexthubseq: number
  unackedbyleaf: Map<string, number | undefined>
  lastleafack: Map<string, number>
  /** Last `ack_peer_seq` sent to each leaf on a hub→leaf message. */
  lasthubackpiggybackedtoleaf: Map<string, number>
}

export function createleafsession(
  peerid: string,
  initial: JSON_DOCUMENT,
): LEAF_SESSION {
  const snap = deepcopy(initial)
  return {
    peer: peerid,
    working: snap,
    shadow: deepcopy(snap),
    backupshadow: undefined,
    basisversion: 0,
    nextseq: 1,
    unackedseq: undefined,
    unackedpreparecount: 0,
    lastpeerseqacked: 0,
    lastackpiggybackedtohub: 0,
  }
}

export function createhubsession(initial: JSON_DOCUMENT): HUB_SESSION {
  const snap = deepcopy(initial)
  return {
    working: deepcopy(snap),
    documentversion: 0,
    leaves: new Map(),
    nexthubseq: 1,
    unackedbyleaf: new Map(),
    lastleafack: new Map(),
    lasthubackpiggybackedtoleaf: new Map(),
  }
}

export function hubensureleaf(
  hub: HUB_SESSION,
  leafid: string,
  initialshadow?: JSON_DOCUMENT,
  emptyshadow?: boolean,
) {
  if (hub.leaves.has(leafid)) {
    return
  }
  const base = deepcopy(
    emptyshadow ? (initialshadow ?? {}) : (initialshadow ?? hub.working),
  )
  hub.leaves.set(leafid, {
    basisversion: hub.documentversion,
    shadow: base,
  })
  hub.unackedbyleaf.set(leafid, undefined)
  hub.lastleafack.set(leafid, 0)
  hub.lasthubackpiggybackedtoleaf.set(leafid, 0)
}

export function resethubleaffromdoc(hub: HUB_SESSION, leafid: string) {
  hubensureleaf(hub, leafid)
  const row = hub.leaves.get(leafid)!
  row.shadow = deepcopy(hub.working)
  row.basisversion = hub.documentversion
}
