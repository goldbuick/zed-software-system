import { createdevice } from 'zss/device'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import {
  applylayercacheupdate,
  emptygadgetstate,
  ismaybeblankgadgetstate,
  useGadgetClient,
} from 'zss/gadget/data/state'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { setcrtcurveamp } from 'zss/gadget/fx/crtanim'
import { setglitchpulse } from 'zss/gadget/fx/glitchpulse'
import { deepcopy, ispresent } from 'zss/mapping/types'
import {
  ishostmemorytraceenabled,
  tracehostmemory,
} from 'zss/testsupport/hostmemorytrace'

import { registerreadplayer } from './register'

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
        const gadget = gadgetjsonpipe.applyfullsync(message.data)
        // always upodate the fallback state
        fallback = deepcopy(gadget)
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
        const gadget = gadgetjsonpipe.applyremote(fallback, message.data)
        if (ispresent(gadget)) {
          // always update the fallback state
          fallback = deepcopy(gadget)
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
        // #region agent log
        if (ishostmemorytraceenabled()) {
          tracehostmemory('gadget:desync', 'H5', registerreadplayer(), undefined, {
            target: message.target,
          })
        }
        // #endregion
        gadgetclientdevice.reply(message, 'desync')
        return state
      })
      break
  }
})
