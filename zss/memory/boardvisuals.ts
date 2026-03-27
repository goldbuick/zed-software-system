import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

import { memoryreadboardbyaddress } from './boards'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { BOARD, CODE_PAGE_TYPE } from './types'

export function memoryupdateboardvisuals(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  if (isstring(board.over)) {
    if (isstring(board.overboard)) {
      const over = memoryreadboardbyaddress(board.overboard)
      if (!ispresent(over)) {
        delete board.overboard
      }
    } else {
      const maybeboard = memoryreadboardbyaddress(board.over)
      if (ispresent(maybeboard)) {
        board.overboard = maybeboard.id
      }
    }
  } else if (isstring(board.overboard)) {
    delete board.overboard
  }

  if (isstring(board.under)) {
    if (isstring(board.underboard)) {
      const under = memoryreadboardbyaddress(board.underboard)
      if (!ispresent(under)) {
        delete board.underboard
      }
    } else {
      const maybeboard = memoryreadboardbyaddress(board.under)
      if (ispresent(maybeboard)) {
        board.underboard = maybeboard.id
      }
    }
  } else if (isstring(board.underboard)) {
    delete board.underboard
  }

  if (isstring(board.charset)) {
    if (isstring(board.charsetpage)) {
      const charset = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.CHARSET,
        board.charset,
      )
      if (!ispresent(charset)) {
        delete board.charsetpage
      }
    } else {
      const maybecharset = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.CHARSET,
        board.charset,
      )
      if (ispresent(maybecharset)) {
        board.charsetpage = maybecharset.id
      }
    }
  } else if (isstring(board.charsetpage)) {
    delete board.charsetpage
  }

  if (isstring(board.palette)) {
    if (isstring(board.palettepage)) {
      const palette = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (!ispresent(palette)) {
        delete board.palettepage
      }
    } else {
      const maybepalette = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (ispresent(maybepalette)) {
        board.palettepage = maybepalette.id
      }
    }
  } else if (isstring(board.palettepage)) {
    delete board.palettepage
  }
}
