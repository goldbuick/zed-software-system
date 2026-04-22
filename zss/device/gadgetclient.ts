import { createdevice } from 'zss/device'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import {
  applylayercacheupdate,
  useGadgetClient,
} from 'zss/gadget/data/zustandstores'
import { ispresent } from 'zss/mapping/types'
import { isgadgetstream, playerfromgadgetstream } from 'zss/memory/memorydirty'

import { JSONSYNC_CHANGED } from './api'
import { registerreadplayer } from './register'

export const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['gadget'],
  (message) => {
    if (!gadgetclientdevice.session(message)) {
      return
    }
    console.info('gadgetclient', message.target, message.data)
    const payload = message.data as JSONSYNC_CHANGED
    if (
      !isgadgetstream(payload?.streamid ?? '') ||
      !ispresent(payload?.document)
    ) {
      return
    }
    const player = registerreadplayer()
    const streampid = playerfromgadgetstream(payload.streamid)
    if (streampid !== player) {
      return
    }
    const incoming = payload.document as GADGET_STATE
    const rev = payload.rev
    useGadgetClient.setState((state) => {
      const prev = state.gadget
      const hasincomingscroll =
        ispresent(incoming.scroll) && incoming.scroll.length > 0
      if (rev < state.gadgetsyncrev) {
        return state
      }
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
        return {
          ...state,
          gadget: incoming,
          gadgetsyncrev: rev,
          gadgetscrolllocal: hasincomingscroll,
          layercachemap: applylayercacheupdate(
            state.layercachemap,
            incoming.board,
            incoming.layers ?? [],
          ),
        }
      }
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
