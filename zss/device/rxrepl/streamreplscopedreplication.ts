/**
 * Per-board and per-player `replicateRxCollection` instances on the shared RxDB
 * mirror collections (`replicationIdentifier` unique per scope). Scope is
 * updated from the boardrunner worker via awaited `streamreplscopedsync*` plus
 * `streamreplscopedawaitinitialsyncforowned` (see `boardrunnerreplcatchup.ts`);
 * `partialscopes.ts` helpers remain for optional deduped callers.
 */
import {
  type RxReplicationState,
  replicateRxCollection,
} from 'rxdb/plugins/replication'
import type { Subscription } from 'rxjs'
import { Subject } from 'rxjs'
import { rxreplpullrequest, rxreplpushbatch } from 'zss/device/api'
import {
  streamreplboardscollection,
  streamreplensureclientdb,
  streamreplflagscollection,
  streamreplgadgetcollection,
  streamreplmirroronreplicationdown,
} from 'zss/device/netsim'
import { isstring } from 'zss/mapping/types'
import {
  MEMORY_STREAM_ID,
  boardfromboardstream,
  boardstream,
  flagsstream,
  gadgetstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'

import type {
  BoardsMirrorRow,
  FlagsMirrorRow,
  GadgetMirrorRow,
  StreamReplRxCheckpoint,
} from './collectionschemas'
import { streamreplpullawaitregister } from './pullawait'
import {
  streamreplpushawaitregister,
  streamreplpushawaitserializedop,
} from './streamreplpushawait'
import { streamreplreplicationctxget } from './streamreplreplicationctx'
import type {
  RXREPL_CHECKPOINT,
  RXREPL_PULL_RESPONSE,
  RXREPL_PUSH_ROW,
  RXREPL_STREAM_DOCUMENT,
} from './types'

function towirecheckpoint(
  ck: StreamReplRxCheckpoint | null | undefined,
): RXREPL_CHECKPOINT | null {
  if (!ck) {
    return null
  }
  return {
    cursor: `zss:${ck.id}:${ck.rev}`,
    streamrevs: {
      [ck.id === MEMORY_STREAM_ID ? MEMORY_STREAM_ID : ck.id]: ck.rev,
    },
  }
}

async function pullfamily(
  streamids: string[],
  last: StreamReplRxCheckpoint | null | undefined,
): Promise<RXREPL_PULL_RESPONSE> {
  const c = streamreplreplicationctxget()
  if (!c) {
    return { checkpoint: { cursor: '' }, documents: [] }
  }
  const player = c.getOwnPlayer()
  if (!player) {
    return { checkpoint: { cursor: '' }, documents: [] }
  }
  const p = streamreplpullawaitregister()
  rxreplpullrequest(c.device, player, {
    checkpoint: towirecheckpoint(last ?? null),
    streamids,
  })
  return p
}

function streamdoctoflagsrow(d: RXREPL_STREAM_DOCUMENT): FlagsMirrorRow {
  const player = playerfromflagsstream(d.streamid)
  return {
    player,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

function streamdoctoboardrow(d: RXREPL_STREAM_DOCUMENT): BoardsMirrorRow {
  const boardId = boardfromboardstream(d.streamid)
  return {
    boardId,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

function streamdoctogadgetrow(d: RXREPL_STREAM_DOCUMENT): GadgetMirrorRow {
  const player = playerfromgadgetstream(d.streamid)
  return {
    player,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

function asflagsmirrorrow(u: unknown): FlagsMirrorRow {
  const r = u as Record<string, unknown>
  return {
    player: String(r.player),
    documentjson: String(r.documentjson),
    rev: Number(r.rev),
    _deleted: Boolean(r._deleted),
  }
}

function asboardsmirrorrow(u: unknown): BoardsMirrorRow {
  const r = u as Record<string, unknown>
  return {
    boardId: String(r.boardId),
    documentjson: String(r.documentjson),
    rev: Number(r.rev),
    _deleted: Boolean(r._deleted),
  }
}

function asgadgetmirrorrow(u: unknown): GadgetMirrorRow {
  const r = u as Record<string, unknown>
  return {
    player: String(r.player),
    documentjson: String(r.documentjson),
    rev: Number(r.rev),
    _deleted: Boolean(r._deleted),
  }
}

type Boardscoped = {
  repl: RxReplicationState<BoardsMirrorRow, StreamReplRxCheckpoint>
  pull$: Subject<
    | 'RESYNC'
    | { documents: BoardsMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
  >
  sub: Subscription
}

type Flagsscoped = {
  repl: RxReplicationState<FlagsMirrorRow, StreamReplRxCheckpoint>
  pull$: Subject<
    | 'RESYNC'
    | { documents: FlagsMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
  >
  sub: Subscription
}

type Gadgetscoped = {
  repl: RxReplicationState<GadgetMirrorRow, StreamReplRxCheckpoint>
  pull$: Subject<
    | 'RESYNC'
    | { documents: GadgetMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
  >
  sub: Subscription
}

const boardsreplbyid = new Map<string, Boardscoped>()
const flagsreplbyplayer = new Map<string, Flagsscoped>()
const gadgetreplbyplayer = new Map<string, Gadgetscoped>()

function submirrordownflags(
  repl: RxReplicationState<FlagsMirrorRow, StreamReplRxCheckpoint>,
): Subscription {
  const received = (
    repl as unknown as {
      received$: { subscribe: (fn: (doc: unknown) => void) => Subscription }
    }
  ).received$
  return received.subscribe((doc: unknown) =>
    streamreplmirroronreplicationdown('flags', doc),
  )
}

function submirrordownboards(
  repl: RxReplicationState<BoardsMirrorRow, StreamReplRxCheckpoint>,
): Subscription {
  const received = (
    repl as unknown as {
      received$: { subscribe: (fn: (doc: unknown) => void) => Subscription }
    }
  ).received$
  return received.subscribe((doc: unknown) =>
    streamreplmirroronreplicationdown('boards', doc),
  )
}

function submirrordowngadget(
  repl: RxReplicationState<GadgetMirrorRow, StreamReplRxCheckpoint>,
): Subscription {
  const received = (
    repl as unknown as {
      received$: { subscribe: (fn: (doc: unknown) => void) => Subscription }
    }
  ).received$
  return received.subscribe((doc: unknown) =>
    streamreplmirroronreplicationdown('gadget', doc),
  )
}

function startboardscoped(boardid: string): void {
  if (boardsreplbyid.has(boardid)) {
    return
  }
  const brc = streamreplboardscollection()
  if (!brc) {
    return
  }
  const pull$ = new Subject<
    | 'RESYNC'
    | { documents: BoardsMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
  >()
  const repl = replicateRxCollection({
    replicationIdentifier: `zss-repl-board-${boardid}`,
    collection: brc,
    deletedField: '_deleted',
    waitForLeadership: false,
    live: true,
    pull: {
      batchSize: 50,
      stream$: pull$,
      async handler(
        lastCheckpoint: StreamReplRxCheckpoint | null | undefined,
        _batchSize: number,
      ) {
        void _batchSize
        const ids = [boardstream(boardid)]
        const body = await pullfamily(ids, lastCheckpoint ?? null)
        const rows: BoardsMirrorRow[] = []
        for (let i = 0; i < body.documents.length; ++i) {
          const d = body.documents[i]
          if (isboardstream(d.streamid)) {
            rows.push(streamdoctoboardrow(d))
          }
        }
        if (rows.length === 0) {
          return {
            documents: [],
            checkpoint:
              lastCheckpoint ??
              ({
                id: boardid,
                rev: 0,
              } as StreamReplRxCheckpoint),
          }
        }
        const last = rows[rows.length - 1]
        return {
          documents: rows,
          checkpoint: { id: last.boardId, rev: last.rev },
        }
      },
    },
    push: {
      batchSize: 50,
      async handler(rows: unknown[]) {
        return streamreplpushawaitserializedop(async () => {
          const c = streamreplreplicationctxget()
          if (!c) {
            return []
          }
          const player = c.getOwnPlayer()
          if (!player || rows.length === 0) {
            return []
          }
          const rws = rows as {
            newDocumentState: unknown
            assumedMasterState?: unknown | null
          }[]
          const batchrows: RXREPL_PUSH_ROW[] = []
          for (let i = 0; i < rws.length; ++i) {
            const doc = asboardsmirrorrow(rws[i].newDocumentState)
            if (doc.boardId !== boardid) {
              continue
            }
            const assumed = rws[i].assumedMasterState
              ? asboardsmirrorrow(rws[i].assumedMasterState)
              : undefined
            batchrows.push({
              streamid: boardstream(doc.boardId),
              document: JSON.parse(doc.documentjson),
              baserev: assumed?.rev,
            })
          }
          if (batchrows.length === 0) {
            return []
          }
          const ackp = streamreplpushawaitregister()
          rxreplpushbatch(c.device, player, { rows: batchrows })
          await ackp
          return []
        })
      },
    },
  }) as unknown as RxReplicationState<BoardsMirrorRow, StreamReplRxCheckpoint>
  const sub = submirrordownboards(repl)
  boardsreplbyid.set(boardid, { repl, pull$, sub })
}

async function cancelboardscoped(boardid: string): Promise<void> {
  const s = boardsreplbyid.get(boardid)
  if (!s) {
    return
  }
  s.sub.unsubscribe()
  boardsreplbyid.delete(boardid)
  await s.repl.cancel().catch(() => undefined)
}

function startflagsscoped(player: string): void {
  if (!player || flagsreplbyplayer.has(player)) {
    return
  }
  const flc = streamreplflagscollection()
  if (!flc) {
    return
  }
  const pull$ = new Subject<
    | 'RESYNC'
    | { documents: FlagsMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
  >()
  const repl = replicateRxCollection({
    replicationIdentifier: `zss-repl-flags-${player}`,
    collection: flc,
    deletedField: '_deleted',
    waitForLeadership: false,
    live: true,
    pull: {
      batchSize: 50,
      stream$: pull$,
      async handler(
        lastCheckpoint: StreamReplRxCheckpoint | null | undefined,
        _batchSize: number,
      ) {
        void _batchSize
        const ids = [flagsstream(player)]
        const body = await pullfamily(ids, lastCheckpoint ?? null)
        const rows: FlagsMirrorRow[] = []
        for (let i = 0; i < body.documents.length; ++i) {
          const d = body.documents[i]
          if (isflagsstream(d.streamid)) {
            rows.push(streamdoctoflagsrow(d))
          }
        }
        if (rows.length === 0) {
          return {
            documents: [],
            checkpoint:
              lastCheckpoint ??
              ({
                id: player,
                rev: 0,
              } as StreamReplRxCheckpoint),
          }
        }
        const last = rows[rows.length - 1]
        return {
          documents: rows,
          checkpoint: { id: last.player, rev: last.rev },
        }
      },
    },
    push: {
      batchSize: 50,
      async handler(rows: unknown[]) {
        return streamreplpushawaitserializedop(async () => {
          const c = streamreplreplicationctxget()
          if (!c) {
            return []
          }
          const own = c.getOwnPlayer()
          if (!own || rows.length === 0) {
            return []
          }
          const rws = rows as {
            newDocumentState: unknown
            assumedMasterState?: unknown | null
          }[]
          const batchrows: RXREPL_PUSH_ROW[] = []
          for (let i = 0; i < rws.length; ++i) {
            const doc = asflagsmirrorrow(rws[i].newDocumentState)
            if (doc.player !== player) {
              continue
            }
            const assumed = rws[i].assumedMasterState
              ? asflagsmirrorrow(rws[i].assumedMasterState)
              : undefined
            batchrows.push({
              streamid: flagsstream(doc.player),
              document: JSON.parse(doc.documentjson),
              baserev: assumed?.rev,
            })
          }
          if (batchrows.length === 0) {
            return []
          }
          const ackp = streamreplpushawaitregister()
          rxreplpushbatch(c.device, own, { rows: batchrows })
          await ackp
          return []
        })
      },
    },
  }) as unknown as RxReplicationState<FlagsMirrorRow, StreamReplRxCheckpoint>
  const sub = submirrordownflags(repl)
  flagsreplbyplayer.set(player, { repl, pull$, sub })
}

async function cancelflagsscoped(player: string): Promise<void> {
  const s = flagsreplbyplayer.get(player)
  if (!s) {
    return
  }
  s.sub.unsubscribe()
  flagsreplbyplayer.delete(player)
  await s.repl.cancel().catch(() => undefined)
}

function startgadgetscoped(player: string): void {
  if (!player || gadgetreplbyplayer.has(player)) {
    return
  }
  const gac = streamreplgadgetcollection()
  if (!gac) {
    return
  }
  const pull$ = new Subject<
    | 'RESYNC'
    | { documents: GadgetMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
  >()
  const repl = replicateRxCollection({
    replicationIdentifier: `zss-repl-gadget-${player}`,
    collection: gac,
    deletedField: '_deleted',
    waitForLeadership: false,
    live: true,
    pull: {
      batchSize: 50,
      stream$: pull$,
      async handler(
        lastCheckpoint: StreamReplRxCheckpoint | null | undefined,
        _batchSize: number,
      ) {
        void _batchSize
        const ids = [gadgetstream(player)]
        const body = await pullfamily(ids, lastCheckpoint ?? null)
        const rows: GadgetMirrorRow[] = []
        for (let i = 0; i < body.documents.length; ++i) {
          const d = body.documents[i]
          if (isgadgetstream(d.streamid)) {
            rows.push(streamdoctogadgetrow(d))
          }
        }
        if (rows.length === 0) {
          return {
            documents: [],
            checkpoint:
              lastCheckpoint ??
              ({
                id: player,
                rev: 0,
              } as StreamReplRxCheckpoint),
          }
        }
        const last = rows[rows.length - 1]
        return {
          documents: rows,
          checkpoint: { id: last.player, rev: last.rev },
        }
      },
    },
    push: {
      batchSize: 50,
      async handler(rows: unknown[]) {
        return streamreplpushawaitserializedop(async () => {
          const c = streamreplreplicationctxget()
          if (!c) {
            return []
          }
          const own = c.getOwnPlayer()
          if (!own || rows.length === 0) {
            return []
          }
          const rws = rows as {
            newDocumentState: unknown
            assumedMasterState?: unknown | null
          }[]
          const batchrows: RXREPL_PUSH_ROW[] = []
          for (let i = 0; i < rws.length; ++i) {
            const doc = asgadgetmirrorrow(rws[i].newDocumentState)
            if (doc.player !== player) {
              continue
            }
            const assumed = rws[i].assumedMasterState
              ? asgadgetmirrorrow(rws[i].assumedMasterState)
              : undefined
            batchrows.push({
              streamid: gadgetstream(doc.player),
              document: JSON.parse(doc.documentjson),
              baserev: assumed?.rev,
            })
          }
          if (batchrows.length === 0) {
            return []
          }
          const ackp = streamreplpushawaitregister()
          rxreplpushbatch(c.device, own, { rows: batchrows })
          await ackp
          return []
        })
      },
    },
  }) as unknown as RxReplicationState<GadgetMirrorRow, StreamReplRxCheckpoint>
  const sub = submirrordowngadget(repl)
  gadgetreplbyplayer.set(player, { repl, pull$, sub })
}

async function cancelgadgetscoped(player: string): Promise<void> {
  const s = gadgetreplbyplayer.get(player)
  if (!s) {
    return
  }
  s.sub.unsubscribe()
  gadgetreplbyplayer.delete(player)
  await s.repl.cancel().catch(() => undefined)
}

/** Sync active board scopes to `ownedBoardIds` (cancel removed, start added). */
export async function streamreplscopedsyncboards(
  ownedBoardIds: Set<string>,
): Promise<void> {
  await streamreplensureclientdb()
  const prev = new Set(boardsreplbyid.keys())
  for (const id of prev) {
    if (!ownedBoardIds.has(id)) {
      await cancelboardscoped(id)
    }
  }
  for (const id of ownedBoardIds) {
    if (isstring(id) && id.length > 0 && !boardsreplbyid.has(id)) {
      startboardscoped(id)
    }
  }
}

/** Sync flags replication instances to `playerIds`. */
export async function streamreplscopedsyncflagsplayers(
  playerIds: Set<string>,
): Promise<void> {
  await streamreplensureclientdb()
  const prev = new Set(flagsreplbyplayer.keys())
  for (const id of prev) {
    if (!playerIds.has(id)) {
      await cancelflagsscoped(id)
    }
  }
  for (const id of playerIds) {
    if (isstring(id) && id.length > 0 && !flagsreplbyplayer.has(id)) {
      startflagsscoped(id)
    }
  }
}

/** Sync gadget replication instances to `playerIds`. */
export async function streamreplscopedsyncgadgetplayers(
  playerIds: Set<string>,
): Promise<void> {
  await streamreplensureclientdb()
  const prev = new Set(gadgetreplbyplayer.keys())
  for (const id of prev) {
    if (!playerIds.has(id)) {
      await cancelgadgetscoped(id)
    }
  }
  for (const id of playerIds) {
    if (isstring(id) && id.length > 0 && !gadgetreplbyplayer.has(id)) {
      startgadgetscoped(id)
    }
  }
}

type Replwithinitial = {
  awaitInitialReplication?: () => Promise<void>
}

async function awaitreplinitialsync(repl: unknown): Promise<void> {
  if (!repl) {
    return
  }
  const r = repl as Replwithinitial
  if (typeof r.awaitInitialReplication !== 'function') {
    return
  }
  await r.awaitInitialReplication()
}

/**
 * After `streamreplscopedsyncboards` / `streamreplscopedsyncflagsplayers` have
 * started instances for these ids, await each repl's first pull round-trip.
 */
export async function streamreplscopedawaitinitialsyncforowned(
  ownedBoardIds: Set<string>,
  flagPlayerIds: Set<string>,
): Promise<void> {
  await streamreplensureclientdb()
  const tasks: Promise<void>[] = []
  for (const id of ownedBoardIds) {
    if (!isstring(id) || id.length === 0) {
      continue
    }
    const s = boardsreplbyid.get(id)
    if (s) {
      tasks.push(awaitreplinitialsync(s.repl))
    }
  }
  for (const id of flagPlayerIds) {
    if (!isstring(id) || id.length === 0) {
      continue
    }
    const s = flagsreplbyplayer.get(id)
    if (s) {
      tasks.push(awaitreplinitialsync(s.repl))
    }
  }
  await Promise.all(tasks)
}

export function streamreplscopedfeedstreamrow(
  doc: RXREPL_STREAM_DOCUMENT,
): void {
  if (!isstring(doc.streamid)) {
    return
  }
  if (isflagsstream(doc.streamid)) {
    const player = playerfromflagsstream(doc.streamid)
    if (player && !flagsreplbyplayer.has(player)) {
      startflagsscoped(player)
    }
    const s = player ? flagsreplbyplayer.get(player) : undefined
    if (!s) {
      return
    }
    const row = streamdoctoflagsrow(doc)
    const ck: StreamReplRxCheckpoint = { id: row.player, rev: doc.rev }
    s.pull$.next({ documents: [row], checkpoint: ck })
    return
  }
  if (isboardstream(doc.streamid)) {
    const bid = boardfromboardstream(doc.streamid)
    if (bid && !boardsreplbyid.has(bid)) {
      startboardscoped(bid)
    }
    const s = bid ? boardsreplbyid.get(bid) : undefined
    if (!s) {
      return
    }
    const row = streamdoctoboardrow(doc)
    const ck: StreamReplRxCheckpoint = { id: row.boardId, rev: doc.rev }
    s.pull$.next({ documents: [row], checkpoint: ck })
    return
  }
  if (isgadgetstream(doc.streamid)) {
    const player = playerfromgadgetstream(doc.streamid)
    if (player && !gadgetreplbyplayer.has(player)) {
      startgadgetscoped(player)
    }
    const s = player ? gadgetreplbyplayer.get(player) : undefined
    if (!s) {
      return
    }
    const row = streamdoctogadgetrow(doc)
    const ck: StreamReplRxCheckpoint = { id: row.player, rev: doc.rev }
    s.pull$.next({ documents: [row], checkpoint: ck })
  }
}

export function streamreplscopedresyncall(): void {
  for (const s of boardsreplbyid.values()) {
    s.repl.reSync()
  }
  for (const s of flagsreplbyplayer.values()) {
    s.repl.reSync()
  }
  for (const s of gadgetreplbyplayer.values()) {
    s.repl.reSync()
  }
}

export async function streamreplscopedcancelall(): Promise<void> {
  const bc = [...boardsreplbyid.keys()]
  for (let i = 0; i < bc.length; ++i) {
    await cancelboardscoped(bc[i])
  }
  const fc = [...flagsreplbyplayer.keys()]
  for (let i = 0; i < fc.length; ++i) {
    await cancelflagsscoped(fc[i])
  }
  const gc = [...gadgetreplbyplayer.keys()]
  for (let i = 0; i < gc.length; ++i) {
    await cancelgadgetscoped(gc[i])
  }
}

/** After `initStreamReplRxReplications` sets ctx; start flags/gadget for own player only until peers sync. */
export async function streamreplscopedinitaftermemory(): Promise<void> {
  const c = streamreplreplicationctxget()
  const own = c?.getOwnPlayer() ?? ''
  const peers = new Set<string>()
  if (own.length > 0) {
    peers.add(own)
  }
  await streamreplscopedsyncboards(new Set())
  await streamreplscopedsyncflagsplayers(peers)
  await streamreplscopedsyncgadgetplayers(peers)
}
