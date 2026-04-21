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
  return ispresent(resolved?.id) && resolved.id.length > 0
    ? resolved.id
    : addrOrId
}

function resolveackboardkeyforplayer(mainbook: BOOK, player: string): string {
  const keys = [
    ...new Set([...Object.keys(ackboardrunners), ...Object.keys(boardrunners)]),
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

function gadgetneedsreplseed(projected: GADGET_STATE): boolean {
  const layersok =
    Array.isArray(projected.layers) && projected.layers.length > 0
  const sidebarok =
    Array.isArray(projected.sidebar) && projected.sidebar.length > 0
  return !layersok || !sidebarok
}

/** Copy sidebar and/or board chrome from `donor` when `projected` is still empty there. */
function mergepeergadgetchrome(
  projected: GADGET_STATE,
  donor: GADGET_STATE,
): GADGET_STATE {
  let out = projected
  const needSidebar = !Array.isArray(out.sidebar) || out.sidebar.length === 0
  const needLayers = !Array.isArray(out.layers) || out.layers.length === 0
  if (needSidebar && Array.isArray(donor.sidebar) && donor.sidebar.length > 0) {
    out = {
      ...out,
      sidebar: deepcopy(donor.sidebar) as GADGET_STATE['sidebar'],
    }
  }
  if (needLayers && Array.isArray(donor.layers) && donor.layers.length > 0) {
    out = {
      ...out,
      layers: deepcopy(donor.layers) as GADGET_STATE['layers'],
      tickers: Array.isArray(donor.tickers)
        ? (deepcopy(donor.tickers) as GADGET_STATE['tickers'])
        : out.tickers,
      board: donor.board,
      boardname: donor.boardname,
      exiteast: donor.exiteast,
      exitwest: donor.exitwest,
      exitnorth: donor.exitnorth,
      exitsouth: donor.exitsouth,
      exitne: donor.exitne,
      exitnw: donor.exitnw,
      exitse: donor.exitse,
      exitsw: donor.exitsw,
      ...(donor.over ? { over: deepcopy(donor.over) } : {}),
      ...(donor.under ? { under: deepcopy(donor.under) } : {}),
      ...(donor.synthstate ? { synthstate: deepcopy(donor.synthstate) } : {}),
    }
  }
  return out
}

/** Joiners (and fresh gadget rows) often have empty `sidebar` / `layers` while the host
 * already built chrome in MEMORY; seed so repl matches UI before an acked runner
 * pushes `gadget:<joiner>` rows. */
export function gadgetseedsidebarfromviewportpeers(
  player: string,
  projected: GADGET_STATE,
): GADGET_STATE {
  let out = projected
  if (!gadgetneedsreplseed(out)) {
    return out
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return out
  }

  const op = memoryreadoperator()
  if (isstring(op) && op.length > 0 && op !== player) {
    out = mergepeergadgetchrome(out, projectgadget(op))
    if (!gadgetneedsreplseed(out)) {
      return out
    }
  }

  const boardid = resolveackboardkeyforplayer(mainbook, player)
  if (isstring(boardid) && boardid.length > 0) {
    const runner = ackboardrunners[boardid] ?? boardrunners[boardid]
    if (isstring(runner) && runner.length > 0 && runner !== player) {
      out = mergepeergadgetchrome(out, projectgadget(runner))
      if (!gadgetneedsreplseed(out)) {
        return out
      }
    }
    const peers = collectviewportpidsforboard(boardid)
    for (let i = 0; i < peers.length; ++i) {
      const peer = peers[i]
      if (peer === player) {
        continue
      }
      out = mergepeergadgetchrome(out, projectgadget(peer))
      if (!gadgetneedsreplseed(out)) {
        return out
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
    out = mergepeergadgetchrome(out, raw as GADGET_STATE)
    if (!gadgetneedsreplseed(out)) {
      return out
    }
  }
  return out
}
