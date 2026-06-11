import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

import { memoryreadboardbyaddress } from './boards'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { memoryensureboardruntime } from './runtimeboundary'
import { BOARD, CODE_PAGE_TYPE } from './types'

export function memoryupdateboardvisuals(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  const boardruntime = memoryensureboardruntime(board)

  if (isstring(board.over)) {
    if (isstring(boardruntime.overboard)) {
      const over = memoryreadboardbyaddress(boardruntime.overboard)
      if (!ispresent(over)) {
        delete boardruntime.overboard
      }
    } else {
      const maybeboard = memoryreadboardbyaddress(board.over)
      if (ispresent(maybeboard)) {
        boardruntime.overboard = maybeboard.id
      }
    }
  } else if (isstring(boardruntime.overboard)) {
    delete boardruntime.overboard
  }

  if (isstring(board.under)) {
    if (isstring(boardruntime.underboard)) {
      const under = memoryreadboardbyaddress(boardruntime.underboard)
      if (!ispresent(under)) {
        delete boardruntime.underboard
      }
    } else {
      const maybeboard = memoryreadboardbyaddress(board.under)
      if (ispresent(maybeboard)) {
        boardruntime.underboard = maybeboard.id
      }
    }
  } else if (isstring(boardruntime.underboard)) {
    delete boardruntime.underboard
  }

  if (isstring(board.charset)) {
    if (isstring(boardruntime.charsetpage)) {
      const charset = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.CHARSET,
        board.charset,
      )
      if (!ispresent(charset)) {
        delete boardruntime.charsetpage
      }
    } else {
      const maybecharset = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.CHARSET,
        board.charset,
      )
      if (ispresent(maybecharset)) {
        boardruntime.charsetpage = maybecharset.id
      }
    }
  } else if (isstring(boardruntime.charsetpage)) {
    delete boardruntime.charsetpage
  }

  if (isstring(board.palette)) {
    if (isstring(boardruntime.palettepage)) {
      const palette = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (!ispresent(palette)) {
        delete boardruntime.palettepage
      }
    } else {
      const maybepalette = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (ispresent(maybepalette)) {
        boardruntime.palettepage = maybepalette.id
      }
    }
  } else if (isstring(boardruntime.palettepage)) {
    delete boardruntime.palettepage
  }
}
