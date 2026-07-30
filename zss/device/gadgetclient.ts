import { createdevice } from 'zss/device'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { decodepatchwire } from 'zss/feature/jsonpipe/wire'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import {
  applylayercacheupdate,
  emptygadgetstate,
  ismaybeblankgadgetstate,
  useGadgetClient,
} from 'zss/gadget/data/zustandstores'
import { setcrtcurveamp } from 'zss/gadget/fx/crtanim'
import { setglitchpulse } from 'zss/gadget/fx/glitchpulse'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { recordgadgetapply } from 'zss/perf/renderupdatestats'

import { registerreadplayer } from './registerplayer'

let fallback = emptygadgetstate()
const gadgetjsonpipe = createjsonpipe<GADGET_STATE>(
  {} as GADGET_STATE,
  () => true,
)

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  if (!gadgetclientdevice.session(message)) {
    return
  }

  // player filter
  if (message.player !== registerreadplayer()) {
    return
  }

  switch (message.target) {
    case 'paint': {
      useGadgetClient.setState((state) => {
        // apply full snapshot
        const applyt0 = performance.now()
        const gadget = gadgetjsonpipe.applyfullsync(message.data)
        const applyms = performance.now() - applyt0
        // always upodate the fallback state
        const copyt0 = performance.now()
        fallback = deepcopy(gadget)
        const deepcopyms = performance.now() - copyt0
        recordgadgetapply(deepcopyms, applyms, 0)
        // avoids flash of blank state between boards
        if (ismaybeblankgadgetstate(gadget)) {
          return state
        }
        const layercachemap = applylayercacheupdate(
          state.layercachemap,
          gadget?.board ?? '',
          gadget?.layers ?? [],
        )
        return {
          gadget,
          layercachemap,
        }
      })
      break
    }
    case 'bonk': {
      setcrtcurveamp(0.025, 0.125)
      break
    }
    case 'zap': {
      setglitchpulse()
      break
    }
    case 'patch':
      if (gadgetjsonpipe.isdesynced()) {
        return
      }
      useGadgetClient.setState((state) => {
        // always patch against the fallback state
        const patch = decodepatchwire(message.data)
        const applyt0 = performance.now()
        const gadget = gadgetjsonpipe.applyremote(fallback, patch)
        const applyms = performance.now() - applyt0
        if (ispresent(gadget)) {
          // always update the fallback state
          const copyt0 = performance.now()
          fallback = deepcopy(gadget)
          const deepcopyms = performance.now() - copyt0
          recordgadgetapply(deepcopyms, applyms, patch.length)
          // avoids flash of blank state between boards
          if (ismaybeblankgadgetstate(gadget)) {
            return state
          }
          // update layer cache and gadget state
          const layercachemap = applylayercacheupdate(
            state.layercachemap,
            gadget?.board ?? '',
            gadget?.layers ?? [],
          )
          return {
            ...state,
            gadget,
            layercachemap,
          }
        }
        // signal desync
        gadgetclientdevice.reply(message, 'desync')
        return state
      })
      break
  }
})
