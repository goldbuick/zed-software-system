/*
RxDB persistence for streamrepl client state: four mirror collections (Memory,
Flags, Boards, Gadget). A synchronous in-memory mirror Map is the hot read path;
it is updated from local writes (`streamreplmirrorputlocal`), hydration, inbound
rows when replication is off, and replication `received$` when replication is
on. Emits `${streamid}:changed` after persisted upsert for local writes (see
streamreplregisterstreamchangeddevice).
*/
import {
  type RxCollection,
  type RxDatabase,
  addRxPlugin,
  createRxDatabase,
} from 'rxdb'
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import {
  MEMORY_STREAM_ID,
  boardfromboardstream,
  boardstream,
  flagsstream,
  gadgetstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'

import {
  type DEVICELIKE,
  type JSONSYNC_CHANGED,
  streamsyncchanged,
} from './api'
import {
  type BoardsMirrorRow,
  type FlagsMirrorRow,
  type GadgetMirrorRow,
  type MemoryMirrorRow,
  boardsMirrorSchema,
  flagsMirrorSchema,
  gadgetMirrorSchema,
  memoryMirrorSchema,
} from './rxrepl/collectionschemas'

export const COLL_MEMORY = 'm_memory'
export const COLL_FLAGS = 'm_flags'
export const COLL_BOARDS = 'm_boards'
export const COLL_GADGET = 'm_gadget'

export type STREAMREPL_CLIENT_STREAM = {
  document: unknown
  rev: number
}

/** Legacy wire shape (tests); mirror rows use family primary keys. */
export type STREAMREPL_CLIENT_ROW = {
  streamid: string
  documentjson: string
  rev: number
}

export function clientstreamrowtostream(row: {
  documentjson: string
  rev: number
}): STREAMREPL_CLIENT_STREAM {
  return {
    document: JSON.parse(row.documentjson) as unknown,
    rev: row.rev,
  }
}

function memoryrowtostream(row: MemoryMirrorRow): STREAMREPL_CLIENT_STREAM {
  return clientstreamrowtostream(row)
}

function flagsrowtostream(
  player: string,
  row: FlagsMirrorRow,
): [string, STREAMREPL_CLIENT_STREAM] {
  return [flagsstream(player), clientstreamrowtostream(row)]
}

function boardsrowtostream(
  boardId: string,
  row: BoardsMirrorRow,
): [string, STREAMREPL_CLIENT_STREAM] {
  return [boardstream(boardId), clientstreamrowtostream(row)]
}

function gadgetrowtostream(
  player: string,
  row: GadgetMirrorRow,
): [string, STREAMREPL_CLIENT_STREAM] {
  return [gadgetstream(player), clientstreamrowtostream(row)]
}

function jestsuffix(): string {
  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
    return `_j${process.env.JEST_WORKER_ID}`
  }
  return ''
}

let clientdb: RxDatabase | null = null
let memorycoll: RxCollection<MemoryMirrorRow> | null = null
let flagscoll: RxCollection<FlagsMirrorRow> | null = null
let boardscoll: RxCollection<BoardsMirrorRow> | null = null
let gadgetcoll: RxCollection<GadgetMirrorRow> | null = null
let clientinit: Promise<void> | null = null

let streamchangeddevice: DEVICELIKE | null = null

/** Synchronous read mirror; writes from local persist, hydration, inbound (no repl), or replication `received$`. */
const mirrorstreammap = new Map<string, STREAMREPL_CLIENT_STREAM>()
/** Dedupes identical-rev `received$` emissions. */
const lastreplicationnotifyrev = new Map<string, number>()
let streamreplreplicationboardnotify: (() => void) | undefined

/** Call from rxreplclient (once) so persisted streams emit `${streamid}:changed`. */
export function streamreplregisterstreamchangeddevice(
  device: DEVICELIKE,
): void {
  streamchangeddevice = device
}

function emitstreamchanged(streamid: string, stream: STREAMREPL_CLIENT_STREAM) {
  if (!streamchangeddevice) {
    return
  }
  const payload: JSONSYNC_CHANGED = {
    streamid,
    reason: 'document',
    rev: stream.rev,
    document: stream.document,
  }
  streamsyncchanged(streamchangeddevice, payload)
}

/**
 * Sim `rxreplclient:stream_row` updates the mirror via `streamreplmirrorsetnonotify`
 * and feeds scoped Rx replication, but Rx `received$` may not run when the row rev
 * matches the checkpoint already materialized in the mirror — so nothing emits
 * `${streamid}:changed` and boardrunner / gadgetclient never hydrate. Call after feed + nonotify
 * for memory / flags / board / gadget; seed `lastreplicationnotifyrev` so a later `received$`
 * duplicate rev skips in `streamreplmirroronreplicationdown`.
 */
export function streamreplnotifymirrorstreamrowrepl(
  streamid: string,
  stream: STREAMREPL_CLIENT_STREAM,
): void {
  if (
    !ismemorystream(streamid) &&
    !isflagsstream(streamid) &&
    !isboardstream(streamid) &&
    !isgadgetstream(streamid)
  ) {
    return
  }
  lastreplicationnotifyrev.set(streamid, stream.rev)
  emitstreamchanged(streamid, stream)
  if (isboardstream(streamid)) {
    streamreplreplicationboardnotify?.()
  }
}

function emitstreamchangedaftermirror(
  streamid: string,
  documentjson: string,
  rev: number,
  skipgadgetemit: boolean,
) {
  if (!streamchangeddevice) {
    return
  }
  if (skipgadgetemit) {
    return
  }
  emitstreamchanged(streamid, clientstreamrowtostream({ documentjson, rev }))
}

export function streamreplregisterreplicationboardnotify(cb: () => void): void {
  streamreplreplicationboardnotify = cb
}

/** Inbound optimistic mirror when RxDB replication applies the same row asynchronously. */
export function streamreplmirrorsetnonotify(
  streamid: string,
  stream: STREAMREPL_CLIENT_STREAM,
): void {
  mirrorstreammap.set(streamid, stream)
}

/** Local write path: mirror + gadget live event + persist queue (historical `streamreplclientstreammap.set`). */
export function streamreplmirrorputlocal(
  streamid: string,
  stream: STREAMREPL_CLIENT_STREAM,
): void {
  mirrorstreammap.set(streamid, stream)
  if (isgadgetstream(streamid) && streamchangeddevice) {
    streamsyncchanged(streamchangeddevice, {
      streamid,
      reason: 'document',
      rev: stream.rev,
      document: stream.document,
    })
  }
  streamreplpersistclientstream(streamid, stream)
}

/** Downstream replication applied `doc` to RxDB; sync read mirror + `${streamid}:changed` (deduped by rev). */
export function streamreplmirroronreplicationdown(
  kind: 'memory' | 'flags' | 'boards' | 'gadget',
  doc: unknown,
): void {
  let streamid = ''
  let row: { documentjson: string; rev: number }
  if (kind === 'memory') {
    const r = doc as MemoryMirrorRow
    streamid = MEMORY_STREAM_ID
    row = r
  } else if (kind === 'flags') {
    const r = doc as FlagsMirrorRow
    streamid = flagsstream(r.player)
    row = r
  } else if (kind === 'boards') {
    const r = doc as BoardsMirrorRow
    streamid = boardstream(r.boardId)
    row = r
  } else {
    const r = doc as GadgetMirrorRow
    streamid = gadgetstream(r.player)
    row = r
  }
  const prevnotified = lastreplicationnotifyrev.get(streamid)
  if (prevnotified === row.rev) {
    return
  }
  lastreplicationnotifyrev.set(streamid, row.rev)
  mirrorstreammap.set(streamid, clientstreamrowtostream(row))
  if (isgadgetstream(streamid) && streamchangeddevice) {
    streamsyncchanged(streamchangeddevice, {
      streamid,
      reason: 'document',
      rev: row.rev,
      document: JSON.parse(row.documentjson) as unknown,
    })
  } else {
    emitstreamchanged(streamid, clientstreamrowtostream(row))
  }
  if (isboardstream(streamid)) {
    streamreplreplicationboardnotify?.()
  }
}

let clientpersisttail: Promise<void> = Promise.resolve()

function enqueueclientpersist(fn: () => Promise<void>): void {
  clientpersisttail = clientpersisttail.then(fn, () => {})
}

export function streamreplawaitclientpersistqueue(): Promise<void> {
  return clientpersisttail
}

let migrationpluginregistered = false

async function initclientdbinner(): Promise<void> {
  if (clientdb) {
    return
  }
  if (!migrationpluginregistered) {
    addRxPlugin(RxDBMigrationSchemaPlugin)
    migrationpluginregistered = true
  }
  const name = `zss_streamrepl_client_v2${jestsuffix()}`
  const db = await createRxDatabase({
    name,
    storage: getRxStorageMemory(),
    multiInstance: false,
    eventReduce: false,
  })
  const cols = await db.addCollections({
    [COLL_MEMORY]: { schema: memoryMirrorSchema },
    [COLL_FLAGS]: { schema: flagsMirrorSchema },
    [COLL_BOARDS]: { schema: boardsMirrorSchema },
    [COLL_GADGET]: { schema: gadgetMirrorSchema },
  })
  clientdb = db
  memorycoll = cols[COLL_MEMORY] as RxCollection<MemoryMirrorRow>
  flagscoll = cols[COLL_FLAGS] as RxCollection<FlagsMirrorRow>
  boardscoll = cols[COLL_BOARDS] as RxCollection<BoardsMirrorRow>
  gadgetcoll = cols[COLL_GADGET] as RxCollection<GadgetMirrorRow>
}

export function streamreplensureclientdb(): Promise<void> {
  return (clientinit ??= initclientdbinner())
}

/** Fill missing mirror-map entries from RxDB (no persist). */
export async function streamreplclienthydratemapmissing(): Promise<void> {
  await streamreplensureclientdb()
  if (!memorycoll || !flagscoll || !boardscoll || !gadgetcoll) {
    return
  }
  const memdocs = await memorycoll.find().exec()
  for (let i = 0; i < memdocs.length; ++i) {
    const d = memdocs[i].toMutableJSON()
    const sid = MEMORY_STREAM_ID
    if (!mirrorstreammap.has(sid)) {
      mirrorstreammap.set(sid, memoryrowtostream(d))
    }
  }
  const fd = await flagscoll.find().exec()
  for (let i = 0; i < fd.length; ++i) {
    const d = fd[i].toMutableJSON()
    const [sid, st] = flagsrowtostream(d.player, d)
    if (!mirrorstreammap.has(sid)) {
      mirrorstreammap.set(sid, st)
    }
  }
  const bd = await boardscoll.find().exec()
  for (let i = 0; i < bd.length; ++i) {
    const d = bd[i].toMutableJSON()
    const [sid, st] = boardsrowtostream(d.boardId, d)
    if (!mirrorstreammap.has(sid)) {
      mirrorstreammap.set(sid, st)
    }
  }
  const gd = await gadgetcoll.find().exec()
  for (let i = 0; i < gd.length; ++i) {
    const d = gd[i].toMutableJSON()
    const [sid, st] = gadgetrowtostream(d.player, d)
    if (!mirrorstreammap.has(sid)) {
      mirrorstreammap.set(sid, st)
    }
  }
}

export function streamreplpersistclientstream(
  streamid: string,
  stream: STREAMREPL_CLIENT_STREAM,
): void {
  const skipgadgetemit = isgadgetstream(streamid)
  const documentjson = JSON.stringify(stream.document)
  const rev = stream.rev
  const rowbase = { documentjson, rev, _deleted: false as const }

  enqueueclientpersist(async () => {
    await streamreplensureclientdb()
    if (!memorycoll || !flagscoll || !boardscoll || !gadgetcoll) {
      return
    }
    if (ismemorystream(streamid)) {
      await memorycoll.incrementalUpsert({
        id: MEMORY_STREAM_ID,
        ...rowbase,
      })
    } else if (isflagsstream(streamid)) {
      const player = playerfromflagsstream(streamid)
      if (player) {
        await flagscoll.incrementalUpsert({ player, ...rowbase })
      }
    } else if (isboardstream(streamid)) {
      const boardId = boardfromboardstream(streamid)
      if (boardId) {
        await boardscoll.incrementalUpsert({ boardId, ...rowbase })
      }
    } else if (isgadgetstream(streamid)) {
      const player = playerfromgadgetstream(streamid)
      if (player) {
        await gadgetcoll.incrementalUpsert({ player, ...rowbase })
      }
    }
    if (!skipgadgetemit) {
      emitstreamchangedaftermirror(streamid, documentjson, rev, skipgadgetemit)
    }
  })
}

export function streamrepldeleteclientstream(streamid: string): void {
  enqueueclientpersist(async () => {
    await streamreplensureclientdb()
    if (!memorycoll || !flagscoll || !boardscoll || !gadgetcoll) {
      return
    }
    if (ismemorystream(streamid)) {
      const doc = await memorycoll.findOne(MEMORY_STREAM_ID).exec()
      if (doc) {
        await doc.remove()
      }
    } else if (isflagsstream(streamid)) {
      const player = playerfromflagsstream(streamid)
      if (player) {
        const doc = await flagscoll.findOne(player).exec()
        if (doc) {
          await doc.remove()
        }
      }
    } else if (isboardstream(streamid)) {
      const boardId = boardfromboardstream(streamid)
      if (boardId) {
        const doc = await boardscoll.findOne(boardId).exec()
        if (doc) {
          await doc.remove()
        }
      }
    } else if (isgadgetstream(streamid)) {
      const player = playerfromgadgetstream(streamid)
      if (player) {
        const doc = await gadgetcoll.findOne(player).exec()
        if (doc) {
          await doc.remove()
        }
      }
    }
  })
}

export function streamreplclearclientstreamsdb(): void {
  enqueueclientpersist(async () => {
    await streamreplensureclientdb()
    if (!memorycoll || !flagscoll || !boardscoll || !gadgetcoll) {
      return
    }
    const a = await memorycoll.find().exec()
    const b = await flagscoll.find().exec()
    const c = await boardscoll.find().exec()
    const d = await gadgetcoll.find().exec()
    await Promise.all([
      ...a.map((x) => x.remove()),
      ...b.map((x) => x.remove()),
      ...c.map((x) => x.remove()),
      ...d.map((x) => x.remove()),
    ])
  })
}

export function streamreplflushclientdbfortests(): Promise<void> {
  return new Promise((resolve) => {
    enqueueclientpersist(async () => {
      await streamreplensureclientdb()
      if (!memorycoll || !flagscoll || !boardscoll || !gadgetcoll) {
        resolve()
        return
      }
      const a = await memorycoll.find().exec()
      const b = await flagscoll.find().exec()
      const c = await boardscoll.find().exec()
      const d = await gadgetcoll.find().exec()
      await Promise.all([
        ...a.map((x) => x.remove()),
        ...b.map((x) => x.remove()),
        ...c.map((x) => x.remove()),
        ...d.map((x) => x.remove()),
      ])
      mirrorstreammap.clear()
      lastreplicationnotifyrev.clear()
      resolve()
    })
  })
}

/** @deprecated Prefer streamreplmemorycollection / family getters. */
export function streamreplclientcollection(): RxCollection<MemoryMirrorRow> | null {
  return memorycoll
}

export function streamreplmemorycollection(): RxCollection<MemoryMirrorRow> | null {
  return memorycoll
}

export function streamreplflagscollection(): RxCollection<FlagsMirrorRow> | null {
  return flagscoll
}

export function streamreplboardscollection(): RxCollection<BoardsMirrorRow> | null {
  return boardscoll
}

export function streamreplgadgetcollection(): RxCollection<GadgetMirrorRow> | null {
  return gadgetcoll
}

export function streamreplreadclientstreamobservable(streamid: string) {
  if (ismemorystream(streamid) && memorycoll) {
    return memorycoll.findOne(MEMORY_STREAM_ID).$
  }
  if (isflagsstream(streamid) && flagscoll) {
    const player = playerfromflagsstream(streamid)
    if (player) {
      return flagscoll.findOne(player).$
    }
  }
  if (isboardstream(streamid) && boardscoll) {
    const boardId = boardfromboardstream(streamid)
    if (boardId) {
      return boardscoll.findOne(boardId).$
    }
  }
  if (isgadgetstream(streamid) && gadgetcoll) {
    const player = playerfromgadgetstream(streamid)
    if (player) {
      return gadgetcoll.findOne(player).$
    }
  }
  return null
}

/**
 * Test / legacy entry points mirroring a `Map`; prefer `streamreplmirrorputlocal`
 * for local writes. `set` persists to RxDB; replication-driven rows update the
 * same backing map via `streamreplmirroronreplicationdown`.
 */
export const streamreplclientstreammap = {
  clear() {
    mirrorstreammap.clear()
    lastreplicationnotifyrev.clear()
    streamreplclearclientstreamsdb()
  },
  delete(streamid: string) {
    const r = mirrorstreammap.delete(streamid)
    streamrepldeleteclientstream(streamid)
    return r
  },
  get: (streamid: string) => mirrorstreammap.get(streamid),
  set(streamid: string, stream: STREAMREPL_CLIENT_STREAM) {
    streamreplmirrorputlocal(streamid, stream)
    return streamreplclientstreammap
  },
  has: (streamid: string) => mirrorstreammap.has(streamid),
  keys: () => mirrorstreammap.keys(),
  [Symbol.iterator]: () => mirrorstreammap[Symbol.iterator](),
}
