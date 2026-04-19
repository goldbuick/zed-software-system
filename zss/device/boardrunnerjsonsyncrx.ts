/*
Optional: after RxDB persists client_streams, mirror into MEMORY via the same
hydrate path as jsonsync:changed. Enable with VITE_ZSS_BOARDRUNNER_RXDB_HYDRATE=1.

Only streams with a local jsonsync client shadow (admitted) are hydrated, matching
memoryworkersync / neighbor admission. Initial DB snapshot is applied once on
startup; then insert$/update$ keep MEMORY aligned without duplicate device
messages for the same write.
*/
import type { Subscription } from 'rxjs'
import { ispresent } from 'zss/mapping/types'

import { jsonsyncclientreadstream } from './jsonsyncclient'
import {
  type JSONSYNC_CLIENT_STREAM_ROW,
  clientstreamrowtostream,
  jsonsyncclientcollection,
  jsonsyncensureclientdb,
} from './jsonsyncdb'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'

let rxsubscriptions: Subscription[] = []

export function boardrunnerrxdbhydrateenabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    if (
      process.env.ZSS_BOARDRUNNER_RXDB_HYDRATE === '1' ||
      process.env.VITE_ZSS_BOARDRUNNER_RXDB_HYDRATE === '1'
    ) {
      return true
    }
  }
  return false
}

function rowtohydratepayload(row: JSONSYNC_CLIENT_STREAM_ROW) {
  return clientstreamrowtostream(row).document
}

export function startboardrunnerjsonsyncrxhydrate(
  rebuildownedboardids: () => void,
): void {
  if (!boardrunnerrxdbhydrateenabled()) {
    return
  }
  void jsonsyncensureclientdb().then(async () => {
    const coll = jsonsyncclientcollection()
    if (!coll || rxsubscriptions.length > 0) {
      return
    }
    const runhydrate = (row: JSONSYNC_CLIENT_STREAM_ROW) => {
      if (!ispresent(jsonsyncclientreadstream(row.streamid))) {
        return
      }
      memoryhydratefromjsonsync(row.streamid, rowtohydratepayload(row))
      rebuildownedboardids()
    }
    const initial = await coll.find().exec()
    for (let i = 0; i < initial.length; ++i) {
      runhydrate(initial[i].toMutableJSON())
    }
    rebuildownedboardids()
    rxsubscriptions.push(
      coll.insert$.subscribe((ev) => {
        runhydrate(ev.documentData as JSONSYNC_CLIENT_STREAM_ROW)
      }),
    )
    rxsubscriptions.push(
      coll.update$.subscribe((ev) => {
        runhydrate(ev.documentData as JSONSYNC_CLIENT_STREAM_ROW)
      }),
    )
  })
}

export function stopboardrunnerjsonsyncrxhydrate(): void {
  for (let i = 0; i < rxsubscriptions.length; ++i) {
    rxsubscriptions[i].unsubscribe()
  }
  rxsubscriptions = []
}
