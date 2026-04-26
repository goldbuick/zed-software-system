/*
rxstreamreplserver: sim-side full-document replication for memory / board:* streams.

Replaces the differential jsonsync server loop: one authoritative document + rev
per stream, fan-out to admitted players via rxreplclient:stream_row.
*/
import { createdevice } from 'zss/device'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import {
  boardfromboardstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

import { rxreplclientstreamrow } from './api'
import {
  projectboardcodepage,
  projectgadget,
  projectmemory,
  projectplayerflags,
} from './vm/memoryproject'

export type RXSTREAMREPL_SERVER_ENTRY = {
  document: unknown
  rev: number
  players: Map<string, { writable: boolean }>
}

const streams = new Map<string, RXSTREAMREPL_SERVER_ENTRY>()

export const rxstreamreplserverdevice = createdevice(
  'rxstreamreplserver',
  [],
  () => {},
)

export function rxstreamreplserverclearfortests(): void {
  streams.clear()
}

export function rxstreamreplserverregister(
  streamid: string,
  document: unknown,
): void {
  if (streams.has(streamid)) {
    return
  }
  streams.set(streamid, {
    document: deepcopy(document),
    rev: 0,
    players: new Map(),
  })
}

function projectfordoc(stream: string): unknown | undefined {
  if (ismemorystream(stream)) {
    return projectmemory()
  }
  if (isboardstream(stream)) {
    const id = boardfromboardstream(stream)
    if (!id) {
      return undefined
    }
    const cp = memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.BOARD, id)
    return ispresent(cp) ? projectboardcodepage(cp) : undefined
  }
  if (isgadgetstream(stream)) {
    const id = playerfromgadgetstream(stream)
    if (!id) {
      return undefined
    }
    return projectgadget(id)
  }
  if (isflagsstream(stream)) {
    const id = playerfromflagsstream(stream)
    if (!id) {
      return undefined
    }
    return projectplayerflags(id)
  }
  return undefined
}

function fanout(streamid: string, document: unknown, rev: number): void {
  const entry = streams.get(streamid)
  if (!entry) {
    return
  }
  for (const player of entry.players.keys()) {
    rxreplclientstreamrow(rxstreamreplserverdevice, player, {
      streamid,
      document: deepcopy(document),
      rev,
    })
  }
}

export function rxstreamreplserverupdate(
  streamid: string,
  nextdoc: unknown,
): void {
  const entry = streams.get(streamid)
  if (!entry) {
    return
  }
  entry.document = deepcopy(nextdoc)
  entry.rev += 1
  fanout(streamid, entry.document, entry.rev)
}

export function rxstreamreplserveradmitplayer(
  streamid: string,
  player: string,
  writable: boolean,
): void {
  const entry = streams.get(streamid)
  if (!entry) {
    return
  }
  entry.players.set(player, { writable })
  rxreplclientstreamrow(rxstreamreplserverdevice, player, {
    streamid,
    document: deepcopy(entry.document),
    rev: entry.rev,
  })
}

/** Admit `player` to `streamid` only if not already present (avoids duplicate `stream_row`). */
export function rxstreamreplserverensureplayeradmitted(
  streamid: string,
  player: string,
  writable: boolean,
): void {
  const entry = streams.get(streamid)
  if (!entry || entry.players.has(player)) {
    return
  }
  rxstreamreplserveradmitplayer(streamid, player, writable)
}

export function rxstreamreplserverdropplayer(
  streamid: string,
  player: string,
): void {
  const entry = streams.get(streamid)
  if (!entry) {
    return
  }
  entry.players.delete(player)
}

export function rxstreamreplserverclose(streamid: string): void {
  streams.delete(streamid)
}

/** Remove a player from every stream (e.g. logout). */
export function rxstreamreplserverdropplayerfromallstreams(
  player: string,
): void {
  for (const entry of streams.values()) {
    entry.players.delete(player)
  }
}

export function rxstreamreplserverreadstream(
  streamid: string,
): RXSTREAMREPL_SERVER_ENTRY | undefined {
  return streams.get(streamid)
}

export function rxstreamreplplayerwritable(
  streamid: string,
  player: string,
): boolean {
  const entry = streams.get(streamid)
  if (!entry) {
    return false
  }
  const p = entry.players.get(player)
  return p?.writable === true
}

/** After rxrepl push_batch merges into MEMORY, refresh projection, bump rev, fan out. */
export function rxstreamreplpublishfrommemory(streamid: string): void {
  const entry = streams.get(streamid)
  if (!entry) {
    return
  }
  const projected = projectfordoc(streamid)
  if (!ispresent(projected)) {
    return
  }
  entry.document = projected
  entry.rev += 1
  fanout(streamid, entry.document, entry.rev)
}
