import { jsondocumentcopy } from 'zss/mapping/types'

import type { HUB_SESSION, JSON_DOCUMENT, LEAF_SESSION } from './types'

export function createleafsession(
  peerid: string,
  initial: JSON_DOCUMENT,
): LEAF_SESSION {
  return {
    peer: peerid,
    working: initial,
    shadow: jsondocumentcopy(initial),
    backupshadow: undefined,
    basisversion: 0,
    nextseq: 1,
    unackedseq: undefined,
    unackedpreparecount: 0,
    lastpeerseqacked: 0,
    lastackpiggybackedtohub: 0,
    awaitingsnapshot: false,
  }
}

export function createhubsession(initial: JSON_DOCUMENT): HUB_SESSION {
  return {
    working: initial,
    versionshadow: jsondocumentcopy(initial),
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
  leaf: string,
  initialshadow?: JSON_DOCUMENT,
  emptyshadow?: boolean,
) {
  if (hub.leaves.has(leaf)) {
    return
  }
  const base = jsondocumentcopy(
    emptyshadow ? (initialshadow ?? {}) : (initialshadow ?? hub.working),
  )
  hub.leaves.set(leaf, {
    basisversion: hub.documentversion,
    shadow: base,
  })
  hub.unackedbyleaf.set(leaf, undefined)
  hub.lastleafack.set(leaf, 0)
  hub.lasthubackpiggybackedtoleaf.set(leaf, 0)
}

export function resethubleaffromdoc(hub: HUB_SESSION, leaf: string) {
  hubensureleaf(hub, leaf)
  const row = hub.leaves.get(leaf)!
  row.shadow = jsondocumentcopy(hub.working)
  row.basisversion = hub.documentversion
}
