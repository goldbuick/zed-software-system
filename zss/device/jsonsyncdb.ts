/*
RxDB persistence for jsonsync client/server stream state (Strategy A).
Synchronous Map mirrors stay authoritative for the hot path; RxDB uses in-memory storage only.
*/
import { type RxCollection, type RxDatabase, createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import type {
  JSONSYNC_CLIENT_STREAM,
  JSONSYNC_SERVER_STREAM,
} from 'zss/feature/jsonsync'

const CLIENT_COLL = 'client_streams'
const SERVER_COLL = 'server_streams'

const DB_VERSION = 0

const clientrowschema = {
  version: DB_VERSION,
  primaryKey: 'streamid',
  type: 'object',
  properties: {
    streamid: { type: 'string', maxLength: 512 },
    documentjson: { type: 'string' },
    shadowjson: { type: 'string' },
    cv: { type: 'number', multipleOf: 1 },
    sv: { type: 'number', multipleOf: 1 },
    arrayidentitykeysjson: { type: 'string' },
  },
  required: [
    'streamid',
    'documentjson',
    'shadowjson',
    'cv',
    'sv',
    'arrayidentitykeysjson',
  ],
} as const

const serverrowschema = {
  version: DB_VERSION,
  primaryKey: 'streamid',
  type: 'object',
  properties: {
    streamid: { type: 'string', maxLength: 512 },
    payloadjson: { type: 'string' },
  },
  required: ['streamid', 'payloadjson'],
} as const

export type JSONSYNC_CLIENT_STREAM_ROW = {
  streamid: string
  documentjson: string
  shadowjson: string
  cv: number
  sv: number
  arrayidentitykeysjson: string
}

type CLIENT_ROW = JSONSYNC_CLIENT_STREAM_ROW

type SERVER_ROW = {
  streamid: string
  payloadjson: string
}

function jestsuffix(): string {
  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
    return `_j${process.env.JEST_WORKER_ID}`
  }
  return ''
}

function serializeserverstream(stream: JSONSYNC_SERVER_STREAM): string {
  return JSON.stringify({
    document: stream.document,
    clients: [...stream.clients.entries()],
    arrayidentitykeys: stream.arrayidentitykeys,
    topkeys: stream.topkeys,
  })
}

export function clientstreamrowtostream(
  row: CLIENT_ROW,
): JSONSYNC_CLIENT_STREAM {
  return {
    document: JSON.parse(row.documentjson) as unknown,
    shadow: JSON.parse(row.shadowjson) as unknown,
    cv: row.cv,
    sv: row.sv,
    arrayidentitykeys: row.arrayidentitykeysjson
      ? (JSON.parse(
          row.arrayidentitykeysjson,
        ) as JSONSYNC_CLIENT_STREAM['arrayidentitykeys'])
      : undefined,
  }
}

function streamtorow(
  streamid: string,
  stream: JSONSYNC_CLIENT_STREAM,
): CLIENT_ROW {
  return {
    streamid,
    documentjson: JSON.stringify(stream.document),
    shadowjson: JSON.stringify(stream.shadow),
    cv: stream.cv,
    sv: stream.sv,
    arrayidentitykeysjson: stream.arrayidentitykeys
      ? JSON.stringify(stream.arrayidentitykeys)
      : '',
  }
}

let clientdb: RxDatabase | null = null
let clientcoll: RxCollection<CLIENT_ROW> | null = null
let clientinit: Promise<void> | null = null

/** Serializes RxDB writes so clear() and upsert never race (Jest + fast ticks). */
let clientpersisttail: Promise<void> = Promise.resolve()

function enqueueclientpersist(fn: () => Promise<void>): void {
  clientpersisttail = clientpersisttail.then(fn, () => {})
}

export function jsonsyncawaitclientpersistqueue(): Promise<void> {
  return clientpersisttail
}

let serverdb: RxDatabase | null = null
let servercoll: RxCollection<SERVER_ROW> | null = null
let serverinit: Promise<void> | null = null

let serverpersisttail: Promise<void> = Promise.resolve()

function enqueueserverpersist(fn: () => Promise<void>): void {
  serverpersisttail = serverpersisttail.then(fn, () => {})
}

export function jsonsyncawaitserverpersistqueue(): Promise<void> {
  return serverpersisttail
}

async function initclientdbinner(): Promise<void> {
  if (clientdb) {
    return
  }
  const name = `zss_jsonsync_client_v1${jestsuffix()}`
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

async function initserverdbinner(): Promise<void> {
  if (serverdb) {
    return
  }
  const name = `zss_jsonsync_server_v1${jestsuffix()}`
  const db = await createRxDatabase({
    name,
    storage: getRxStorageMemory(),
    multiInstance: false,
    eventReduce: false,
  })
  const cols = await db.addCollections({
    [SERVER_COLL]: { schema: serverrowschema },
  })
  serverdb = db
  servercoll = cols[SERVER_COLL] as RxCollection<SERVER_ROW>
}

export function jsonsyncensureclientdb(): Promise<void> {
  return (clientinit ??= initclientdbinner())
}

export function jsonsyncensureserverdb(): Promise<void> {
  return (serverinit ??= initserverdbinner())
}

export async function jsonsyncclienthydratemapmissing(
  map: Map<string, JSONSYNC_CLIENT_STREAM>,
): Promise<void> {
  await jsonsyncensureclientdb()
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

export function jsonsyncpersistclientstream(
  streamid: string,
  stream: JSONSYNC_CLIENT_STREAM,
): void {
  enqueueclientpersist(async () => {
    await jsonsyncensureclientdb()
    if (!clientcoll) {
      return
    }
    await clientcoll.incrementalUpsert(streamtorow(streamid, stream))
  })
}

export function jsonsyncdeleteclientstream(streamid: string): void {
  enqueueclientpersist(async () => {
    await jsonsyncensureclientdb()
    if (!clientcoll) {
      return
    }
    const doc = await clientcoll.findOne(streamid).exec()
    if (doc) {
      await doc.remove()
    }
  })
}

export function jsonsyncclearclientstreamsdb(): void {
  enqueueclientpersist(async () => {
    await jsonsyncensureclientdb()
    if (!clientcoll) {
      return
    }
    const docs = await clientcoll.find().exec()
    await Promise.all(docs.map((d) => d.remove()))
  })
}

export function jsonsyncflushclientdbfortests(): Promise<void> {
  return new Promise((resolve) => {
    enqueueclientpersist(async () => {
      await jsonsyncensureclientdb()
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

export function jsonsyncpersistservstream(
  streamid: string,
  stream: JSONSYNC_SERVER_STREAM,
): void {
  enqueueserverpersist(async () => {
    await jsonsyncensureserverdb()
    if (!servercoll) {
      return
    }
    await servercoll.incrementalUpsert({
      streamid,
      payloadjson: serializeserverstream(stream),
    })
  })
}

export function jsonsyncdeleteservstream(streamid: string): void {
  enqueueserverpersist(async () => {
    await jsonsyncensureserverdb()
    if (!servercoll) {
      return
    }
    const doc = await servercoll.findOne(streamid).exec()
    if (doc) {
      await doc.remove()
    }
  })
}

export function jsonsyncclearservstreamsdb(): void {
  enqueueserverpersist(async () => {
    await jsonsyncensureserverdb()
    if (!servercoll) {
      return
    }
    const docs = await servercoll.find().exec()
    await Promise.all(docs.map((d) => d.remove()))
  })
}

export function jsonsyncclientcollection(): RxCollection<CLIENT_ROW> | null {
  return clientcoll
}

export function jsonsyncreadclientstreamobservable(streamid: string) {
  if (!clientcoll) {
    return null
  }
  return clientcoll.findOne(streamid).$
}

class JsonsyncClientStreamMap extends Map<string, JSONSYNC_CLIENT_STREAM> {
  override set(streamid: string, stream: JSONSYNC_CLIENT_STREAM) {
    super.set(streamid, stream)
    jsonsyncpersistclientstream(streamid, stream)
    return this
  }

  override delete(streamid: string) {
    const r = super.delete(streamid)
    jsonsyncdeleteclientstream(streamid)
    return r
  }

  override clear() {
    super.clear()
    jsonsyncclearclientstreamsdb()
  }
}

class JsonsyncServerStreamMap extends Map<string, JSONSYNC_SERVER_STREAM> {
  override set(streamid: string, stream: JSONSYNC_SERVER_STREAM) {
    super.set(streamid, stream)
    jsonsyncpersistservstream(streamid, stream)
    return this
  }

  override delete(streamid: string) {
    const r = super.delete(streamid)
    jsonsyncdeleteservstream(streamid)
    return r
  }

  override clear() {
    super.clear()
    jsonsyncclearservstreamsdb()
  }
}

export const jsonsyncclientstreammap = new JsonsyncClientStreamMap()

export const jsonsyncserverstreammap = new JsonsyncServerStreamMap()
