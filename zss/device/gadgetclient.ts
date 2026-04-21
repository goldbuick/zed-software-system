import { createdevice } from 'zss/device'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import {
  applylayercacheupdate,
  useGadgetClient,
} from 'zss/gadget/data/zustandstores'
import { ispresent } from 'zss/mapping/types'
import {
  isgadgetstream,
  playeridfromgadgetstream,
} from 'zss/memory/memorydirty'

import { JSONSYNC_CHANGED } from './api'
import { registerreadplayer } from './register'

export const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['gadget'],
  (message) => {
    if (!gadgetclientdevice.session(message)) {
      return
    }
    const payload = message.data as JSONSYNC_CHANGED
    if (
      !isgadgetstream(payload?.streamid ?? '') ||
      !ispresent(payload?.document)
    ) {
      return
    }
    const player = registerreadplayer()
    const streampid = playeridfromgadgetstream(payload.streamid)
    if (streampid !== player) {
      return
    }
    const incoming = payload.document as GADGET_STATE
    const rev = payload.rev
    useGadgetClient.setState((state) => {
      const prev = state.gadget
      if (rev < state.gadgetsyncrev) {
        return state
      }
      // my guess is that when we find the reason host player gets CONSTANT gadget state
      // updates. AND a join player gets infrequent updates to the gadget state.
      if (rev === state.gadgetsyncrev) {
        const keepScroll =
          (!incoming.scroll || incoming.scroll.length === 0) &&
          ispresent(prev.scroll) &&
          prev.scroll.length > 0
        const keepSidebar =
          (!incoming.sidebar || incoming.sidebar.length === 0) &&
          ispresent(prev.sidebar) &&
          prev.sidebar.length > 0
        if (keepScroll || keepSidebar) {
          return {
            ...state,
            gadget: {
              ...incoming,
              ...(keepScroll
                ? {
                    scroll: prev.scroll,
                    scrollname: prev.scrollname ?? incoming.scrollname ?? '',
                  }
                : {}),
              ...(keepSidebar ? { sidebar: prev.sidebar } : {}),
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
        const hasprevsidebar =
          ispresent(prev.sidebar) && prev.sidebar.length > 0
        const hasincomingsidebar =
          ispresent(incoming.sidebar) && incoming.sidebar.length > 0
        const keepSidebar = hasprevsidebar && !hasincomingsidebar
        return {
          gadget: {
            ...incoming,
            scroll: prev.scroll,
            scrollname: prev.scrollname ?? incoming.scrollname ?? '',
            ...(keepSidebar ? { sidebar: prev.sidebar } : {}),
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
      const hasprevsidebar = ispresent(prev.sidebar) && prev.sidebar.length > 0
      const hasincomingsidebar =
        ispresent(incoming.sidebar) && incoming.sidebar.length > 0
      const layerpaint = (incoming.layers?.length ?? 0) > 0
      if (hasprevsidebar && !hasincomingsidebar && layerpaint) {
        return {
          gadget: {
            ...incoming,
            sidebar: prev.sidebar,
          },
          gadgetsyncrev: rev,
          gadgetscrolllocal: hasincomingscroll,
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
