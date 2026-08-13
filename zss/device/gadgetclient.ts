import { createdevice } from 'zss/device'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { decodepatchwire } from 'zss/feature/jsonpipe/wire'
import {
  type GADGET_STATE,
  type LAYER,
  attachcontroltogadget,
} from 'zss/gadget/data/types'
import {
  applylayercacheupdate,
  emptygadgetstate,
  ismaybeblankgadgetstate,
  useGadgetClient,
} from 'zss/gadget/data/zustandstores'
import {
  markboardfaderesetorigin,
  resetboardfade,
  startboardfade,
  startboardfadein,
  startboardfadeout,
  useBoardFade,
} from 'zss/gadget/fx/boardfade'
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

/** While true, board-changing paint/patch is held off the display until black. */
let awaitingboardreveal = false
let deferredgadget: GADGET_STATE | undefined

function commitgadgetdisplay(gadget: GADGET_STATE) {
  useGadgetClient.setState((state) => {
    if (ismaybeblankgadgetstate(gadget)) {
      return state
    }
    const withcontrol = attachcontroltogadget(gadget)
    const layercachemap = applylayercacheupdate(
      state.layercachemap,
      withcontrol?.board ?? '',
      withcontrol?.layers ?? [],
    )
    return {
      gadget: withcontrol,
      layercachemap,
    }
  })
}

function flushdeferredgadget() {
  if (!ispresent(deferredgadget)) {
    return
  }
  const gadget = deferredgadget
  deferredgadget = undefined
  awaitingboardreveal = false
  commitgadgetdisplay(gadget)
}

type GADGET_DISPLAY_STATE = {
  gadget: GADGET_STATE
  layercachemap: Map<string, LAYER[]>
}

function maybedefergadgetdisplay(
  state: GADGET_DISPLAY_STATE,
  gadget: GADGET_STATE,
): { deferred: boolean; next?: GADGET_DISPLAY_STATE } {
  if (ismaybeblankgadgetstate(gadget)) {
    return { deferred: true }
  }
  const displayedboard = state.gadget?.board ?? ''
  const nextboard = gadget.board ?? ''
  const boardchanged = nextboard !== displayedboard
  if (!awaitingboardreveal || !boardchanged) {
    const withcontrol = attachcontroltogadget(gadget)
    const layercachemap = applylayercacheupdate(
      state.layercachemap,
      nextboard,
      withcontrol?.layers ?? [],
    )
    return {
      deferred: false,
      next: { gadget: withcontrol, layercachemap },
    }
  }

  const phase = useBoardFade.getState().phase
  if (phase === 'out') {
    deferredgadget = gadget
    return { deferred: true }
  }

  // Hold / in / idle after out: already at or past black -- reveal now.
  awaitingboardreveal = false
  deferredgadget = undefined
  const withcontrol = attachcontroltogadget(gadget)
  const layercachemap = applylayercacheupdate(
    state.layercachemap,
    nextboard,
    withcontrol?.layers ?? [],
  )
  return {
    deferred: false,
    next: { gadget: withcontrol, layercachemap },
  }
}

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
        const result = maybedefergadgetdisplay(state, gadget)
        if (result.deferred || !ispresent(result.next)) {
          return state
        }
        return result.next
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
    case 'fadeout': {
      startboardfadeout()
      break
    }
    case 'fadein': {
      startboardfadein()
      break
    }
    case 'gotofade': {
      awaitingboardreveal = true
      deferredgadget = undefined
      if (message.data === true) {
        markboardfaderesetorigin()
      }
      startboardfade({
        onoutcomplete: () => {
          flushdeferredgadget()
        },
      })
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
          const result = maybedefergadgetdisplay(state, gadget)
          if (result.deferred || !ispresent(result.next)) {
            return state
          }
          return {
            ...state,
            ...result.next,
          }
        }
        // signal desync
        gadgetclientdevice.reply(message, 'desync')
        return state
      })
      break
  }
})

/** Test helper: clear fade deferral state between cases. */
export function resetgadgetclientboardfade() {
  awaitingboardreveal = false
  deferredgadget = undefined
  resetboardfade()
}
