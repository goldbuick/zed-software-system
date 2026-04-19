/*
RxDB (in-memory storage) for per-player rxrepl gadget rows (opaque JSON per player + rev).
Worker and main each have their own DB in their JS realm.
*/
import { type RxCollection, type RxDatabase, createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { MAYBE, ispresent } from 'zss/mapping/types'

const COLL = 'gadget_repl_doc'
const DB_VERSION = 0

const rowschema = {
  version: DB_VERSION,
  primaryKey: 'player',
  type: 'object',
  properties: {
    player: { type: 'string', maxLength: 512 },
    documentjson: { type: 'string' },
    rev: { type: 'number', multipleOf: 1 },
  },
  required: ['player', 'documentjson', 'rev'],
} as const

export type GADGETSYNC_ROW = {
  player: string
  documentjson: string
  rev: number
}

export type GADGETSYNC_ROW_INPUT =
  | GADGETSYNC_ROW
  | {
      player: string
      rev: number
      gadget: GADGET_STATE
      /** When set (e.g. caller already computed dedupe string), skip re-exporting. */
      documentjson?: string
    }

/** JSON snapshot of gadget state for dedupe / RxDB `documentjson`; `undefined` if serialization fails. */
export function gadgetdocumentjson(gadget: GADGET_STATE): string | undefined {
  try {
    return JSON.stringify(gadget)
  } catch {
    return undefined
  }
}

/** Parse gadget JSON from RxDB or wire. */
export function parsegadgetdocumentjson(raw: string): MAYBE<GADGET_STATE> {
  try {
    return JSON.parse(raw) as GADGET_STATE
  } catch {
    return undefined
  }
}

function jestsuffix(): string {
  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
    return `_j${process.env.JEST_WORKER_ID}`
  }
  return ''
}

let gadgetdb: RxDatabase | null = null
let gadgetcoll: RxCollection<GADGETSYNC_ROW> | null = null
let gadgetinit: Promise<void> | null = null

let gadgetpersisttail: Promise<void> = Promise.resolve()

function enqueuegadgetpersist(fn: () => Promise<void>): void {
  gadgetpersisttail = gadgetpersisttail.then(fn, () => {})
}

export function gadgetsyncawaitpersistqueue(): Promise<void> {
  return gadgetpersisttail
}

async function initinner(): Promise<void> {
  if (gadgetdb) {
    return
  }
  const name = `zss_gadget_repl_v1${jestsuffix()}`
  const db = await createRxDatabase({
    name,
    storage: getRxStorageMemory(),
    multiInstance: false,
    eventReduce: false,
  })
  const cols = await db.addCollections({
    [COLL]: { schema: rowschema },
  })
  gadgetdb = db
  gadgetcoll = cols[COLL] as RxCollection<GADGETSYNC_ROW>
}

export function gadgetsyncensure(): Promise<void> {
  return (gadgetinit ??= initinner())
}

export function gadgetsynccollection(): RxCollection<GADGETSYNC_ROW> | null {
  return gadgetcoll
}

export function gadgetsyncpersistrow(row: GADGETSYNC_ROW_INPUT): void {
  let normalized: GADGETSYNC_ROW
  if ('gadget' in row) {
    const documentjson = row.documentjson ?? gadgetdocumentjson(row.gadget)
    if (!ispresent(documentjson)) {
      return
    }
    normalized = {
      player: row.player,
      rev: row.rev,
      documentjson,
    }
  } else {
    normalized = row
  }
  enqueuegadgetpersist(async () => {
    await gadgetsyncensure()
    if (!gadgetcoll) {
      return
    }
    await gadgetcoll.incrementalUpsert(normalized)
  })
}

export function gadgetsyncreadobservable(player: string) {
  if (!gadgetcoll) {
    return null
  }
  return gadgetcoll.findOne(player).$
}

/** Upsert if rev is newer than stored; caller supplies serialized payload. */
export function gadgetsyncingest(
  player: string,
  documentjson: string,
  rev: number,
): void {
  enqueuegadgetpersist(async () => {
    await gadgetsyncensure()
    if (!gadgetcoll) {
      return
    }
    const existing = await gadgetcoll.findOne(player).exec()
    if (existing && existing.rev >= rev) {
      return
    }
    await gadgetcoll.incrementalUpsert({
      player,
      documentjson,
      rev,
    })
  })
}

export function gadgetsyncflushdbfortests(): Promise<void> {
  return new Promise((resolve) => {
    enqueuegadgetpersist(async () => {
      await gadgetsyncensure()
      if (!gadgetcoll) {
        resolve()
        return
      }
      const docs = await gadgetcoll.find().exec()
      await Promise.all(docs.map((d) => d.remove()))
      resolve()
    })
  })
}
