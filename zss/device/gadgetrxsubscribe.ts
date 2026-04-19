import { isjoin } from 'zss/feature/url'
import { applylayercacheupdate, useGadgetClient } from 'zss/gadget/data/state'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadoperator } from 'zss/memory/session'

import {
  gadgetsynccollection,
  gadgetsyncensure,
  gadgetsyncreadobservable,
  parsegadgetdocumentjson,
} from './gadgetsyncdb'
import { registerreadplayer } from './register'

let rafid = 0
let pendingdocumentjson: string | null = null

/** Join clients ingest gadget rows keyed by stream player (often host/operator); subscribe using the same id once MEMORY.operator syncs. */
function gadgetrxpreferredplayer(localplayer: string): string {
  if (!isjoin()) {
    return localplayer
  }
  const op = memoryreadoperator()
  if (isstring(op) && op.length > 0) {
    return op
  }
  return localplayer
}

function flushgadgetrepldoc() {
  rafid = 0
  if (pendingdocumentjson === null) {
    return
  }
  const raw = pendingdocumentjson
  pendingdocumentjson = null
  const gadget = parsegadgetdocumentjson(raw)
  if (!ispresent(gadget)) {
    return
  }
  useGadgetClient.setState((state) => ({
    gadget,
    layercachemap: applylayercacheupdate(
      state.layercachemap,
      gadget?.board ?? '',
      gadget?.layers ?? [],
    ),
  }))
}

/** Main thread: RxDB gadget repl row → Zustand (replaces gadgetclient paint/patch). */
export function startgadgetslimsubscription(): void {
  void gadgetsyncensure().then(() => {
    const localplayer = registerreadplayer()
    if (!localplayer) {
      return
    }

    if (isjoin()) {
      const coll = gadgetsynccollection()
      if (!coll) {
        return
      }
      coll.find().$.subscribe((docs) => {
        const preferred = gadgetrxpreferredplayer(localplayer)
        const doc =
          docs.find((d) => d.toMutableJSON().player === preferred) ??
          docs.find((d) => d.toMutableJSON().player === localplayer) ??
          (docs.length === 1 ? docs[0] : undefined)
        if (!doc) {
          return
        }
        const row = doc.toMutableJSON()
        if (!ispresent(row.documentjson)) {
          return
        }
        pendingdocumentjson = row.documentjson
        if (rafid) {
          return
        }
        rafid = requestAnimationFrame(flushgadgetrepldoc)
      })
      return
    }

    const obs = gadgetsyncreadobservable(localplayer)
    if (!obs) {
      return
    }
    obs.subscribe((doc) => {
      if (!doc) {
        return
      }
      const row = doc.toMutableJSON()
      if (!ispresent(row.documentjson)) {
        return
      }
      pendingdocumentjson = row.documentjson
      if (rafid) {
        return
      }
      rafid = requestAnimationFrame(flushgadgetrepldoc)
    })
  })
}
