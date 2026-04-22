/**
 * RxDB `replicateRxCollection` (pull + push) for stream mirror families + live `pull.stream$`.
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
  streamreplmemorycollection,
  streamreplmirroronreplicationdown,
} from 'zss/device/netsim'
import { isstring } from 'zss/mapping/types'
import {
  MEMORY_STREAM_ID,
  boardfromboardstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'

import type { DEVICELIKE } from '../api'

import type {
  BoardsMirrorRow,
  FlagsMirrorRow,
  GadgetMirrorRow,
  MemoryMirrorRow,
  StreamReplRxCheckpoint,
} from './collectionschemas'
import {
  streamreplpullawaitclear,
  streamreplpullawaitnotify,
  streamreplpullawaitregister,
} from './pullawait'
import {
  streamreplpushawaitclear,
  streamreplpushawaitregister,
  streamreplpushawaitserializedop,
} from './streamreplpushawait'
import { streamreplreplicationctxset } from './streamreplreplicationctx'
import {
  streamreplscopedcancelall,
  streamreplscopedfeedstreamrow,
  streamreplscopedinitaftermemory,
  streamreplscopedresyncall,
} from './streamreplscopedreplication'
import type {
  RXREPL_CHECKPOINT,
  RXREPL_PULL_RESPONSE,
  RXREPL_PUSH_ROW,
  RXREPL_STREAM_DOCUMENT,
} from './types'

function toWireCheckpoint(
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

export function streamDocToMemoryRow(
  d: RXREPL_STREAM_DOCUMENT,
): MemoryMirrorRow {
  return {
    id: MEMORY_STREAM_ID,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

export function streamDocToFlagsRow(d: RXREPL_STREAM_DOCUMENT): FlagsMirrorRow {
  const player = playerfromflagsstream(d.streamid)
  return {
    player,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

export function streamDocToBoardRow(
  d: RXREPL_STREAM_DOCUMENT,
): BoardsMirrorRow {
  const boardId = boardfromboardstream(d.streamid)
  return {
    boardId,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

export function streamDocToGadgetRow(
  d: RXREPL_STREAM_DOCUMENT,
): GadgetMirrorRow {
  const player = playerfromgadgetstream(d.streamid)
  return {
    player,
    rev: d.rev,
    documentjson: JSON.stringify(d.document),
    _deleted: false,
  }
}

function asmemorymirrorrow(u: unknown): MemoryMirrorRow {
  const r = u as Record<string, unknown>
  return {
    id: String(r.id),
    documentjson: String(r.documentjson),
    rev: Number(r.rev),
    _deleted: Boolean(r._deleted),
  }
}

let mirrordownsubs: Subscription[] = []

function tearmirrordownsubs(): void {
  for (let i = 0; i < mirrordownsubs.length; ++i) {
    mirrordownsubs[i].unsubscribe()
  }
  mirrordownsubs = []
}

function wiremirrordownsubs(
  mem: RxReplicationState<MemoryMirrorRow, StreamReplRxCheckpoint> | null,
): void {
  tearmirrordownsubs()
  if (!mem) {
    return
  }
  const received = (
    mem as unknown as {
      received$: { subscribe: (fn: (doc: unknown) => void) => Subscription }
    }
  ).received$
  mirrordownsubs.push(
    received.subscribe((doc: unknown) =>
      streamreplmirroronreplicationdown('memory', doc),
    ),
  )
}

export function streamreplreplicationisactive(): boolean {
  return memoryRepl !== null
}

const memoryPull$ = new Subject<
  | 'RESYNC'
  | { documents: MemoryMirrorRow[]; checkpoint: StreamReplRxCheckpoint }
>()

type ReplCtx = {
  device: DEVICELIKE
  getOwnPlayer: () => string
}

let ctx: ReplCtx | null = null

let memoryRepl: RxReplicationState<
  MemoryMirrorRow,
  StreamReplRxCheckpoint
> | null = null

export function streamreplreplicationmemory(): typeof memoryRepl {
  return memoryRepl
}

export function streamreplreplicationresynceverything(): void {
  memoryRepl?.reSync()
  streamreplscopedresyncall()
}

export function streamreplreplicationfeedstreamrow(
  doc: RXREPL_STREAM_DOCUMENT,
): void {
  if (!isstring(doc.streamid)) {
    return
  }
  if (ismemorystream(doc.streamid)) {
    const row = streamDocToMemoryRow(doc)
    const ck: StreamReplRxCheckpoint = { id: MEMORY_STREAM_ID, rev: doc.rev }
    memoryPull$.next({ documents: [row], checkpoint: ck })
    return
  }
  if (
    isflagsstream(doc.streamid) ||
    isboardstream(doc.streamid) ||
    isgadgetstream(doc.streamid)
  ) {
    streamreplscopedfeedstreamrow(doc)
  }
}

/** Resolves pending `pull.handler` waiters only; documents are applied via handler return (not `stream$`) to avoid double-apply. */
export function streamreplreplicationfeedpullresponse(
  body: RXREPL_PULL_RESPONSE,
): void {
  streamreplpullawaitnotify(body)
}

/** Test / second init: cancel replication and clear pull waiter so `initStreamReplRxReplications` can run again. */
export async function streamreplreplicationteardownfortests(): Promise<void> {
  tearmirrordownsubs()
  streamreplpullawaitclear()
  streamreplpushawaitclear()
  await streamreplscopedcancelall()
  await memoryRepl?.cancel().catch(() => undefined)
  memoryRepl = null
  ctx = null
  streamreplreplicationctxset(null)
}

async function pullFamily(
  streamids: string[],
  last: StreamReplRxCheckpoint | null | undefined,
): Promise<RXREPL_PULL_RESPONSE> {
  const c = ctx
  if (!c) {
    return { checkpoint: { cursor: '' }, documents: [] }
  }
  const player = c.getOwnPlayer()
  if (!player) {
    return { checkpoint: { cursor: '' }, documents: [] }
  }
  const p = streamreplpullawaitregister()
  rxreplpullrequest(c.device, player, {
    checkpoint: toWireCheckpoint(last ?? null),
    streamids,
  })
  return p
}

export async function initStreamReplRxReplications(
  args: ReplCtx,
): Promise<void> {
  if (memoryRepl) {
    await streamreplreplicationteardownfortests()
  }
  ctx = args
  streamreplreplicationctxset(args)
  await streamreplensureclientdb()
  const memc = streamreplmemorycollection()
  const flc = streamreplflagscollection()
  const brc = streamreplboardscollection()
  const gac = streamreplgadgetcollection()
  if (!memc || !flc || !brc || !gac) {
    return
  }

  memoryRepl = replicateRxCollection({
    replicationIdentifier: 'zss-repl-memory',
    collection: memc,
    deletedField: '_deleted',
    waitForLeadership: false,
    live: true,
    pull: {
      batchSize: 50,
      stream$: memoryPull$,
      async handler(
        lastCheckpoint: StreamReplRxCheckpoint | null | undefined,
        batchSize: number,
      ) {
        void batchSize
        const want = [MEMORY_STREAM_ID]
        const body = await pullFamily(want, lastCheckpoint ?? null)
        const rows: MemoryMirrorRow[] = []
        for (let i = 0; i < body.documents.length; ++i) {
          const d = body.documents[i]
          if (ismemorystream(d.streamid)) {
            rows.push(streamDocToMemoryRow(d))
          }
        }
        if (rows.length === 0) {
          return {
            documents: [],
            checkpoint:
              lastCheckpoint ??
              ({
                id: MEMORY_STREAM_ID,
                rev: 0,
              } as StreamReplRxCheckpoint),
          }
        }
        const last = rows[rows.length - 1]
        return {
          documents: rows,
          checkpoint: { id: MEMORY_STREAM_ID, rev: last.rev },
        }
      },
    },
    push: {
      batchSize: 50,
      async handler(rows: unknown[]) {
        return streamreplpushawaitserializedop(async () => {
          const c = ctx
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
            const doc = asmemorymirrorrow(rws[i].newDocumentState)
            const assumed = rws[i].assumedMasterState
              ? asmemorymirrorrow(rws[i].assumedMasterState)
              : undefined
            batchrows.push({
              streamid: MEMORY_STREAM_ID,
              document: JSON.parse(doc.documentjson),
              baserev: assumed?.rev,
            })
          }
          const ackp = streamreplpushawaitregister()
          rxreplpushbatch(c.device, player, { rows: batchrows })
          await ackp
          return []
        })
      },
    },
  }) as unknown as RxReplicationState<MemoryMirrorRow, StreamReplRxCheckpoint>

  wiremirrordownsubs(memoryRepl)
  await streamreplscopedinitaftermemory()
}
