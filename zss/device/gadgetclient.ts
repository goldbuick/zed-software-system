import { createdevice } from 'zss/device'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import {
  applylayercacheupdate,
  useGadgetClient,
} from 'zss/gadget/data/zustandstores'
import { ispresent } from 'zss/mapping/types'

import { JSONSYNC_CHANGED } from './api'
import { registerreadplayer } from './register'

export const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['gadget'],
  (message) => {
    if (!gadgetclientdevice.session(message) || !ispresent(message.data)) {
      return
    }
    console.info(message)
    return
    const payload = message.data as JSONSYNC_CHANGED
    if (
      !payload.streamid?.startsWith('gadget:') ||
      !ispresent(payload.document)
    ) {
      return
    }
    const player = registerreadplayer()
    const pid = payload.streamid.slice('gadget:'.length)
    if (pid !== player) {
      return
    }
    const incoming = payload.document as GADGET_STATE
    const rev = payload.rev
    useGadgetClient.setState((state) => {
      const prev = state.gadget
      if (rev < state.gadgetsyncrev) {
        return state
      }
      if (rev === state.gadgetsyncrev) {
        if (
          (!incoming.scroll || incoming.scroll.length === 0) &&
          prev.scroll &&
          prev.scroll.length > 0
        ) {
          return {
            ...state,
            gadget: {
              ...incoming,
              scroll: prev.scroll,
              scrollname: prev.scrollname ?? incoming.scrollname ?? '',
            },
            layercachemap: applylayercacheupdate(
              state.layercachemap,
              incoming.board,
              incoming.layers ?? [],
            ),
          }
        }
        return state
      }
      const hasincomingscroll =
        ispresent(incoming.scroll) && incoming.scroll.length > 0
      const hasprevscroll = ispresent(prev.scroll) && prev.scroll.length > 0
      if (hasprevscroll && !hasincomingscroll && state.gadgetscrolllocal) {
        return {
          gadget: {
            ...incoming,
            scroll: prev.scroll,
            scrollname: prev.scrollname ?? incoming.scrollname ?? '',
          },
          gadgetsyncrev: rev,
          gadgetscrolllocal: true,
          layercachemap: applylayercacheupdate(
            state.layercachemap,
            incoming.board,
            incoming.layers ?? [],
          ),
        }
      }
      return {
        gadget: incoming,
        gadgetsyncrev: rev,
        gadgetscrolllocal: hasincomingscroll,
        layercachemap: applylayercacheupdate(
          state.layercachemap,
          incoming.board,
          incoming.layers ?? [],
        ),
      }
    })
  },
)
