import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

import { memoryreadboardbyaddress } from './boards'
import { memoryreadcodepage } from './bookoperations'
import { memorypickcodepage } from './codepages'
import { memoryreadbooklist } from './session'
import { BOARD, BOOK, CODE_PAGE_TYPE } from './types'

const WORLD_CHARSET_NAME = 'world'

function memoryreadbookforboard(board: BOARD): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (!ispresent(book)) {
      continue
    }
    const page = memoryreadcodepage(book, board.id, CODE_PAGE_TYPE.BOARD)
    if (ispresent(page)) {
      return book
    }
  }
  return undefined
}

function memorybindboardcharsetpage(board: BOARD, charsetname: string) {
  if (isstring(board.charsetpage)) {
    const charset = memorypickcodepage(
      memoryreadbooklist(),
      CODE_PAGE_TYPE.CHARSET,
      charsetname,
    )
    if (!ispresent(charset)) {
      delete board.charsetpage
    }
  } else {
    const maybecharset = memorypickcodepage(
      memoryreadbooklist(),
      CODE_PAGE_TYPE.CHARSET,
      charsetname,
    )
    if (ispresent(maybecharset)) {
      board.charsetpage = maybecharset.id
    }
  }
}

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
    memorybindboardcharsetpage(board, board.charset)
  } else {
    const book = memoryreadbookforboard(board)
    const worldpage = ispresent(book)
      ? memoryreadcodepage(book, WORLD_CHARSET_NAME, CODE_PAGE_TYPE.CHARSET)
      : undefined
    if (ispresent(worldpage)) {
      board.charsetpage = worldpage.id
    } else if (isstring(board.charsetpage)) {
      delete board.charsetpage
    }
  }

  if (isstring(board.palette)) {
    if (isstring(board.palettepage)) {
      const palette = memorypickcodepage(
        memoryreadbooklist(),
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (!ispresent(palette)) {
        delete board.palettepage
      }
    } else {
      const maybepalette = memorypickcodepage(
        memoryreadbooklist(),
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
