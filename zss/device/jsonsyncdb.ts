/*
RxDB persistence for streamrepl client state (memory / board:* full documents).
Synchronous Map mirrors stay authoritative for the hot path; RxDB uses in-memory storage only.
After each persisted upsert, emits `${streamid}:changed` on the registered device (see streamreplregisterstreamchangeddevice).
*/
import { type RxCollection, type RxDatabase, createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'

import {
  type DEVICELIKE,
  type JSONSYNC_CHANGED,
  streamsyncchanged,
} from './api'

const CLIENT_COLL = 'client_streams'

const DB_VERSION = 0

const clientrowschema = {
  version: DB_VERSION,
  primaryKey: 'streamid',
  type: 'object',
  properties: {
    streamid: { type: 'string', maxLength: 512 },
    documentjson: { type: 'string' },
    rev: { type: 'number', multipleOf: 1 },
  },
  required: ['streamid', 'documentjson', 'rev'],
} as const

export type STREAMREPL_CLIENT_STREAM = {
  document: unknown
  rev: number
}

export type STREAMREPL_CLIENT_ROW = {
  streamid: string
  documentjson: string
  rev: number
}

type CLIENT_ROW = STREAMREPL_CLIENT_ROW

export function clientstreamrowtostream(
  row: CLIENT_ROW,
): STREAMREPL_CLIENT_STREAM {
  return {
    document: JSON.parse(row.documentjson) as unknown,
    rev: row.rev,
  }
}

function streamtorow(
  streamid: string,
  stream: STREAMREPL_CLIENT_STREAM,
): CLIENT_ROW {
  return {
    streamid,
    documentjson: JSON.stringify(stream.document),
    rev: stream.rev,
  }
}

function jestsuffix(): string {
  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
    return `_j${process.env.JEST_WORKER_ID}`
  }
  return ''
}

let clientdb: RxDatabase | null = null
let clientcoll: RxCollection<CLIENT_ROW> | null = null
let clientinit: Promise<void> | null = null

let streamchangeddevice: DEVICELIKE | null = null

/** Call from rxreplclient (once) so persisted streams emit `${streamid}:changed`. */
export function streamreplregisterstreamchangeddevice(device: DEVICELIKE): void {
  streamchangeddevice = device
}

function emitstreamchangedafterrow(row: CLIENT_ROW): void {
  if (!streamchangeddevice) {
    return
  }
  const stream = clientstreamrowtostream(row)
  const payload: JSONSYNC_CHANGED = {
    streamid: row.streamid,
    reason: 'document',
    rev: stream.rev,
    document: stream.document,
  }
  streamsyncchanged(streamchangeddevice, payload)
}

let clientpersisttail: Promise<void> = Promise.resolve()

function enqueueclientpersist(fn: () => Promise<void>): void {
  clientpersisttail = clientpersisttail.then(fn, () => {})
}

export function streamreplawaitclientpersistqueue(): Promise<void> {
  return clientpersisttail
}

async function initclientdbinner(): Promise<void> {
  if (clientdb) {
    return
  }
  const name = `zss_streamrepl_client_v1${jestsuffix()}`
  const db = await createRxDatabase({
    name,
    storage: getRxStorageMemory(),
    multiInstance: false,
    eventReduce: false,
  })
  const cols = await db.addCollections({
    [CLIENT_COLL]: { schema: clientrowschema },
  })
  clientdb = db
  clientcoll = cols[CLIENT_COLL] as RxCollection<CLIENT_ROW>
}

export function streamreplensureclientdb(): Promise<void> {
  return (clientinit ??= initclientdbinner())
}

export async function streamreplclienthydratemapmissing(
  map: Map<string, STREAMREPL_CLIENT_STREAM>,
): Promise<void> {
  await streamreplensureclientdb()
  if (!clientcoll) {
    return
  }
  const docs = await clientcoll.find().exec()
  for (let i = 0; i < docs.length; ++i) {
    const d = docs[i].toMutableJSON()
    if (!map.has(d.streamid)) {
      map.set(d.streamid, clientstreamrowtostream(d))
    }
  }
}

export function streamreplpersistclientstream(
  streamid: string,
  stream: STREAMREPL_CLIENT_STREAM,
): void {
  enqueueclientpersist(async () => {
    await streamreplensureclientdb()
    if (!clientcoll) {
      return
    }
    const row = streamtorow(streamid, stream)
    await clientcoll.incrementalUpsert(row)
    emitstreamchangedafterrow(row)
  })
}

export function streamrepldeleteclientstream(streamid: string): void {
  enqueueclientpersist(async () => {
    await streamreplensureclientdb()
    if (!clientcoll) {
      return
    }
    const doc = await clientcoll.findOne(streamid).exec()
    if (doc) {
      await doc.remove()
    }
  })
}

export function streamreplclearclientstreamsdb(): void {
  enqueueclientpersist(async () => {
    await streamreplensureclientdb()
    if (!clientcoll) {
      return
    }
    const docs = await clientcoll.find().exec()
    await Promise.all(docs.map((d) => d.remove()))
  })
}

export function streamreplflushclientdbfortests(): Promise<void> {
  return new Promise((resolve) => {
    enqueueclientpersist(async () => {
      await streamreplensureclientdb()
      if (!clientcoll) {
        resolve()
        return
      }
      const docs = await clientcoll.find().exec()
      await Promise.all(docs.map((d) => d.remove()))
      resolve()
    })
  })
}

export function streamreplclientcollection(): RxCollection<CLIENT_ROW> | null {
  return clientcoll
}

export function streamreplreadclientstreamobservable(streamid: string) {
  if (!clientcoll) {
    return null
  }
  return clientcoll.findOne(streamid).$
}

class StreamreplClientStreamMap extends Map<string, STREAMREPL_CLIENT_STREAM> {
  override set(streamid: string, stream: STREAMREPL_CLIENT_STREAM) {
    super.set(streamid, stream)
    streamreplpersistclientstream(streamid, stream)
    return this
  }

  override delete(streamid: string) {
    const r = super.delete(streamid)
    streamrepldeleteclientstream(streamid)
    return r
  }

  override clear() {
    super.clear()
    streamreplclearclientstreamsdb()
  }
}

export const streamreplclientstreammap = new StreamreplClientStreamMap()
