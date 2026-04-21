import type { GADGET_STATE } from 'zss/gadget/data/types'
import { ispid } from 'zss/mapping/guid'
import { deepcopy, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryreadbookflag,
  memoryreadbookflags,
} from 'zss/memory/bookoperations'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { projectgadget } from './memoryproject'
import { ackboardrunners, boardrunners } from './state'

function resolvedboardid(mainbook: BOOK, player: string): string {
  const flag = memoryreadbookflag(mainbook, player, 'board')
  if (!isstring(flag) || !flag) {
    return ''
  }
  const resolved = memoryreadboardbyaddress(flag)
  return ispresent(resolved?.id) && resolved.id.length > 0 ? resolved.id : flag
}

export function collectviewportpidsforboard(boardid: string): string[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return []
  }
  const out: string[] = []
  const seen = new Set<string>()
  const active = mainbook.activelist ?? []
  for (let i = 0; i < active.length; ++i) {
    const p = active[i]
    const bid = resolvedboardid(mainbook, p)
    if (bid === boardid) {
      out.push(p)
      seen.add(p)
    }
  }
  const op = memoryreadoperator()
  if (isstring(op) && op.length > 0 && !seen.has(op)) {
    const opbid = resolvedboardid(mainbook, op)
    if (opbid === boardid) {
      out.push(op)
    }
  }
  const flagids = Object.keys(mainbook.flags ?? {})
  for (let i = 0; i < flagids.length; ++i) {
    const p = flagids[i]
    if (!ispid(p) || p.endsWith('_chip') || seen.has(p)) {
      continue
    }
    const bid = resolvedboardid(mainbook, p)
    if (bid === boardid) {
      out.push(p)
      seen.add(p)
    }
  }
  return out
}

function canonicalboardref(addrOrId: string): string {
  if (!isstring(addrOrId) || !addrOrId) {
    return ''
  }
  const resolved = memoryreadboardbyaddress(addrOrId)
  return ispresent(resolved?.id) && resolved.id.length > 0 ? resolved.id : addrOrId
}

function resolveackboardkeyforplayer(mainbook: BOOK, player: string): string {
  const keys = [
    ...new Set([
      ...Object.keys(ackboardrunners),
      ...Object.keys(boardrunners),
    ]),
  ]
  const raw = memoryreadbookflag(mainbook, player, 'board')
  const resolvedPlayer = resolvedboardid(mainbook, player)
  const candidates: string[] = []
  if (isstring(raw) && raw.length > 0) {
    candidates.push(raw)
  }
  if (isstring(resolvedPlayer) && resolvedPlayer.length > 0) {
    candidates.push(resolvedPlayer)
  }
  const canon = new Set<string>()
  for (let i = 0; i < candidates.length; ++i) {
    const c = canonicalboardref(candidates[i])
    if (isstring(c) && c.length > 0) {
      canon.add(c)
    }
  }
  for (let ki = 0; ki < keys.length; ++ki) {
    const bid = keys[ki]
    for (let ci = 0; ci < candidates.length; ++ci) {
      if (bid === candidates[ci]) {
        return bid
      }
    }
    const bidCanon = canonicalboardref(bid)
    for (const c of canon) {
      if (bidCanon === c) {
        return bid
      }
    }
  }
  for (let ki = 0; ki < keys.length; ++ki) {
    const bid = keys[ki]
    if (collectviewportpidsforboard(bid).includes(player)) {
      return bid
    }
  }
  if (keys.length === 1 && isstring(keys[0]) && keys[0].length > 0) {
    return keys[0]
  }
  return ''
}

/** Joiners (and fresh gadget rows) often have an empty `sidebar` while the host
 * already built board chrome in the acked runner's gadget; seed so repl matches UI. */
export function gadgetseedsidebarfromviewportpeers(
  player: string,
  projected: GADGET_STATE,
): GADGET_STATE {
  if (Array.isArray(projected.sidebar) && projected.sidebar.length > 0) {
    return projected
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return projected
  }
  const boardid = resolveackboardkeyforplayer(mainbook, player)
  if (isstring(boardid) && boardid.length > 0) {
    const runner = ackboardrunners[boardid] ?? boardrunners[boardid]
    if (isstring(runner) && runner.length > 0 && runner !== player) {
      const rungadget = projectgadget(runner)
      if (Array.isArray(rungadget.sidebar) && rungadget.sidebar.length > 0) {
        return {
          ...projected,
          sidebar: deepcopy(rungadget.sidebar) as GADGET_STATE['sidebar'],
        }
      }
    }
    const peers = collectviewportpidsforboard(boardid)
    for (let i = 0; i < peers.length; ++i) {
      const peer = peers[i]
      if (peer === player) {
        continue
      }
      const g = projectgadget(peer)
      if (Array.isArray(g.sidebar) && g.sidebar.length > 0) {
        return {
          ...projected,
          sidebar: deepcopy(g.sidebar) as GADGET_STATE['sidebar'],
        }
      }
    }
  }
  const gadgetstore = memoryreadbookflags(
    mainbook,
    MEMORY_LABEL.GADGETSTORE,
  ) as Record<string, unknown>
  const gpids = Object.keys(gadgetstore)
  for (let i = 0; i < gpids.length; ++i) {
    const pid = gpids[i]
    if (pid === player || !ispid(pid) || pid.endsWith('_chip')) {
      continue
    }
    const raw = gadgetstore[pid]
    if (!ispresent(raw) || typeof raw !== 'object') {
      continue
    }
    const g = raw as GADGET_STATE
    if (Array.isArray(g.sidebar) && g.sidebar.length > 0) {
      return {
        ...projected,
        sidebar: deepcopy(g.sidebar) as GADGET_STATE['sidebar'],
      }
    }
  }
  return projected
}
