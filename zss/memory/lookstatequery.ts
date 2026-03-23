import type { LOOK_STATE } from 'zss/feature/heavy/formatstate'
import { gadgetstate } from 'zss/gadget/data/api'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'

/** Snapshot for `formatlookfortext`: board tickers (from gadget layers) plus gadget scroll/sidebar. */
export function memoryreadlookstatequery(agentid: string): LOOK_STATE {
  const board = memoryreadplayerboard(agentid)
  const { tickers } = memoryreadgadgetlayers(agentid, board)
  const gadget = gadgetstate(agentid)
  const scroll = gadget.scroll
  const sidebar = gadget.sidebar
  return {
    board: ispresent(board) ? board : undefined,
    tickers: tickers.length > 0 ? tickers : undefined,
    scrollname: gadget.scrollname,
    scroll: ispresent(scroll) && scroll.length > 0 ? scroll : undefined,
    sidebar: ispresent(sidebar) && sidebar.length > 0 ? sidebar : undefined,
  }
}
