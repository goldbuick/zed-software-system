import type { FORMAT_OBJECT } from 'zss/feature/format'
import { importgadgetstate } from 'zss/gadget/data/compress'
import { applylayercacheupdate, useGadgetClient } from 'zss/gadget/data/state'
import { ispresent } from 'zss/mapping/types'

import { gadgetsyncensure, gadgetsyncreadobservable } from './gadgetsyncdb'
import { registerreadplayer } from './register'

let rafid = 0
let pendingdocumentjson: string | null = null

function flushgadgetrepldoc() {
  rafid = 0
  if (pendingdocumentjson === null) {
    return
  }
  const raw = pendingdocumentjson
  pendingdocumentjson = null
  const slim = JSON.parse(raw) as FORMAT_OBJECT
  const gadget = importgadgetstate(slim)
  useGadgetClient.setState((state) => ({
    desync: false,
    gadget,
    slim,
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
    const player = registerreadplayer()
    if (!player) {
      return
    }
    const obs = gadgetsyncreadobservable(player)
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
