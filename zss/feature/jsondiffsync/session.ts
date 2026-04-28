import { deepcopy } from 'zss/mapping/types'

import type { JsonDocument } from './types'

/**
 * Leaf (or any peer in a single hub session).
 *
 * Outbound ops = compare(shadow, working). Shadow advances only after the counterparty acks our
 * seq; until then we retransmit a cumulative delta (Fraser guaranteed delivery).
 */
export type LeafSession = {
  peerid: string
  working: JsonDocument
  shadow: JsonDocument
  backupshadow: JsonDocument | undefined
  /** Aligned with hub leaf row / hub.document_version after last successful exchange. */
  basis_version: number
  next_seq: number
  unacked_seq: number | undefined
  /** Incremented on each prepareoutbound while unacked; used to mark retransmits. */
  unacked_prepare_count: number
  last_peer_seq_acked: number
  /** Highest hub seq reflected in leaf→hub `ack_peer_seq` (for ack-only sends). */
  last_ack_piggybacked_to_hub: number
}

export type HubLeafRecord = {
  basis_version: number
  shadow: JsonDocument
}

export type HubSession = {
  working: JsonDocument
  document_version: number
  leaves: Map<string, HubLeafRecord>
  next_hub_seq: number
  unacked_by_leaf: Map<string, number | undefined>
  last_leaf_ack: Map<string, number>
  /** Last `ack_peer_seq` sent to each leaf on a hub→leaf message. */
  last_hub_ack_piggybacked_to_leaf: Map<string, number>
}

export function createleafsession(
  peerid: string,
  initial: JsonDocument,
): LeafSession {
  const snap = deepcopy(initial)
  return {
    peerid,
    working: snap,
    shadow: deepcopy(snap),
    backupshadow: undefined,
    basis_version: 0,
    next_seq: 1,
    unacked_seq: undefined,
    unacked_prepare_count: 0,
    last_peer_seq_acked: 0,
    last_ack_piggybacked_to_hub: 0,
  }
}

export function createhubsession(initial: JsonDocument): HubSession {
  const snap = deepcopy(initial)
  return {
    working: deepcopy(snap),
    document_version: 0,
    leaves: new Map(),
    next_hub_seq: 1,
    unacked_by_leaf: new Map(),
    last_leaf_ack: new Map(),
    last_hub_ack_piggybacked_to_leaf: new Map(),
  }
}

export function hubensureleaf(
  hub: HubSession,
  leafid: string,
  initialshadow?: JsonDocument,
  emptyshadow?: boolean,
) {
  if (hub.leaves.has(leafid)) {
    return
  }
  const base = deepcopy(
    emptyshadow ? (initialshadow ?? {}) : (initialshadow ?? hub.working),
  )
  hub.leaves.set(leafid, {
    basis_version: hub.document_version,
    shadow: base,
  })
  hub.unacked_by_leaf.set(leafid, undefined)
  hub.last_leaf_ack.set(leafid, 0)
  hub.last_hub_ack_piggybacked_to_leaf.set(leafid, 0)
}

export function resethubleaffromdoc(hub: HubSession, leafid: string) {
  hubensureleaf(hub, leafid)
  const row = hub.leaves.get(leafid)!
  row.shadow = deepcopy(hub.working)
  row.basis_version = hub.document_version
}
