import { pick, unique } from 'zss/mapping/array'
import { createsid, createnameid, createshortnameid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, deepcopy, ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { COLLISION, NAME, PT, WORD } from 'zss/words/types'

import { boardelementindex, boardobjectread } from './board'
import { boardelementisobject } from './boardelement'
import { bookboardcheckblockedobject, bookboardsetlookup } from './bookboard'
import {
  codepagereaddata,
  codepagereadname,
  codepagereadstats,
  codepagereadtype,
  codepagetypetostring,
  createcodepage,
  exportcodepage,
  importcodepage,
} from './codepage'
import { FORMAT_OBJECT, formatobject, unformatobject } from './format'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

// player state

export function createbook(pages: CODE_PAGE[]): BOOK {
  return {
    id: createsid(),
    name: createnameid(),
    timestamp: 0,
    activelist: [],
    pages,
    flags: {},
  }
}

enum BOOK_KEYS {
  id,
  name,
  timestamp,
  activelist,
  pages,
  flags,
  token,
}

export function exportbook(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  return formatobject(book, BOOK_KEYS, {
    pages: (pages) => pages.map(exportcodepage),
    flags: (flags: Record<string, BOOK_FLAGS>) => {
      const ids = Object.keys(flags)
      for (let i = 0; i < ids.length; ++i) {
        // drop empty flag entries
        const id = ids[i]
        if (Object.keys(flags[id]).length === 0) {
          delete flags[id]
        }
      }
      return flags
    },
  })
}

export function importbook(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  return unformatobject(bookentry, BOOK_KEYS, {
    pages: (pages) => pages.map(importcodepage),
  })
}

export function bookupdatetoken(book: MAYBE<BOOK>) {
  if (ispresent(book)) {
    book.token = `${createshortnameid()}${randominteger(1111, 9999)}`
  }
}

export function bookhasmatch(book: MAYBE<BOOK>, ids: string[]): boolean {
  if (!ispresent(book)) {
    return false
  }
  if (ids.some((id) => id === book.id)) {
    return true
  }
  return false
}

export function bookreadcodepagebyaddress(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  const codepage = book.pages.find(
    (item) => item.id === address || laddress === codepagereadname(item),
  )

  return codepage
}

export function bookreadcodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  const codepage = book.pages.find(
    (item) =>
      codepagereadtype(item) === type &&
      (item.id === address || laddress === codepagereadname(item)),
  )

  return codepage
}

export function bookensurecodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): MAYBE<CODE_PAGE> {
  let codepage = bookreadcodepagewithtype(book, type, address)
  if (!ispresent(codepage)) {
    // create new codepage
    const typestr = codepagetypetostring(type)
    codepage = createcodepage(
      typestr === 'object'
        ? `@${address || 'object'}\n`
        : `@${typestr} ${address}\n`,
      {},
    )
    bookwritecodepage(book, codepage)
  }
  return codepage
}

export function bookreadcodepagesbytype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages.filter((item) => codepagereadtype(item) === type)
}

export function bookreadcodepagesbytypeandstat(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const result = book.pages
    .filter((item) => codepagereadtype(item) === type)
    .filter((codepage) => {
      const stats = codepagereadstats(codepage)
      const codepagename = NAME(codepagereadname(codepage))
      return (
        codepage.id === statname ||
        maybename === codepagename ||
        ispresent(stats[statname])
      )
    })
  return result
}

export function bookreadcodepagedatabytype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
) {
  if (!ispresent(book)) {
    return []
  }
  return book.pages
    .filter((item) => codepagereadtype(item) === type)
    .map((page) => codepagereaddata(page))
    .filter(ispresent)
}

export function bookreadsortedcodepages(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return []
  }
  const sorted = deepcopy(book.pages).sort((a, b) => {
    const atype = codepagereadtype(a)
    const btype = codepagereadtype(b)
    if (atype === btype) {
      return codepagereadname(a).localeCompare(codepagereadname(b))
    }
    return btype - atype
  })
  return sorted
}

export function bookboardelementreadcodepage(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<CODE_PAGE> {
  // figure out stats from kind codepage
  if (ispresent(element)) {
    // check for terrain element
    const terrainpage = bookreadcodepagewithtype(
      book,
      CODE_PAGE_TYPE.TERRAIN,
      element.kind ?? '',
    )
    if (ispresent(terrainpage)) {
      return terrainpage
    }
    // check for object element
    const objectpage = bookreadcodepagewithtype(
      book,
      CODE_PAGE_TYPE.OBJECT,
      element.kind ?? '',
    )
    if (ispresent(objectpage)) {
      return objectpage
    }
  }
  return undefined
}

export function bookwritecodepage(
  book: MAYBE<BOOK>,
  codepage: MAYBE<CODE_PAGE>,
): boolean {
  if (!ispresent(book) || !ispresent(codepage)) {
    return false
  }

  const existing = bookreadcodepagebyaddress(book, codepage.id)
  if (ispresent(existing)) {
    return false
  }

  book.pages.push(codepage)
  bookupdatetoken(book)

  return true
}

export function bookclearcodepage(book: MAYBE<BOOK>, address: string) {
  const codepage = bookreadcodepagebyaddress(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = NAME(address)
    book.pages = book.pages.filter(
      (item) => item.id !== address && laddress !== codepagereadname(item),
    )
    bookupdatetoken(book)
    return codepage
  }
}

export function bookelementkindread(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(element) && ispresent(element.kind)) {
    if (!ispresent(element.kinddata)) {
      element.kinddata = ispresent(element.id)
        ? bookreadobject(book, element.kind)
        : bookreadterrain(book, element.kind)
    }
    return element.kinddata
  }
  return undefined
}

export function bookelementstatread(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
  stat: BOARD_ELEMENT_STAT,
) {
  const kind = bookelementkindread(book, element)
  return element?.[stat] ?? kind?.[stat]
}

export function bookelementgroupread(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
) {
  let groupid = createsid()
  const groupstat = bookelementstatread(book, element, 'group')
  if (isstring(groupstat)) {
    groupid = groupstat
  }
  const kindgroupstat = bookelementstatread(book, element?.kinddata, 'group')
  if (isstring(kindgroupstat)) {
    groupid = kindgroupstat
  }
  return groupid
}

export function bookelementdisplayread(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
  defaultchar: number,
  defaultcolor: number,
  defaultbg: number,
) {
  const kind = bookelementkindread(book, element)
  return {
    char: element?.char ?? kind?.char ?? defaultchar,
    color: element?.color ?? kind?.color ?? defaultcolor,
    bg: element?.bg ?? kind?.bg ?? defaultbg,
    light: element?.light ?? kind?.light ?? 0,
  }
}

export function bookreadobject(
  book: MAYBE<BOOK>,
  maybeobject: MAYBE<string>,
): MAYBE<BOARD_ELEMENT> {
  const object = maybeobject ?? ''
  const page = bookreadcodepagewithtype(book, CODE_PAGE_TYPE.OBJECT, object)
  if (ispresent(page)) {
    const data = codepagereaddata<CODE_PAGE_TYPE.OBJECT>(page)
    return {
      ...deepcopy(data),
      name: object,
      code: page.code,
    } as BOARD_ELEMENT
  }
  return undefined
}

export function bookreadterrain(
  book: MAYBE<BOOK>,
  maybeterrain: MAYBE<string>,
): MAYBE<BOARD_ELEMENT> {
  const terrain = maybeterrain ?? ''
  const page = bookreadcodepagewithtype(book, CODE_PAGE_TYPE.TERRAIN, terrain)
  if (ispresent(page)) {
    const data = codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(page)
    return {
      ...deepcopy(data),
      name: terrain,
      code: page.code,
    } as BOARD_ELEMENT
  }
  return undefined
}

export function bookreadboard(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<BOARD> {
  const codepage = bookreadcodepagebyaddress(book, address)
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function bookreadflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return {}
  }
  book.flags[id] = book.flags[id] ?? {}
  return book.flags[id]
}

export function bookclearflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return
  }
  delete book.flags[id]
}

export function bookreadflag(book: MAYBE<BOOK>, id: string, name: string) {
  const flags = bookreadflags(book, id)
  return flags?.[name]
}

export function bookwriteflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
  value: WORD,
) {
  const flags = bookreadflags(book, id)
  if (flags) {
    flags[name] = value
  }
  return value
}

export function bookplayerreadboard(book: MAYBE<BOOK>, player: string) {
  const value = bookreadflag(book, player, 'board')
  return bookreadboard(book, isstring(value) ? value : '')
}

export function bookplayerreadactive(book: MAYBE<BOOK>, player: string) {
  return book?.activelist.includes(player) ?? false
}

export function bookplayersetboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
) {
  if (!ispresent(book)) {
    return
  }
  // write board flag
  bookwriteflag(book, player, 'board', board)

  // determine if player is on a board
  const maybeboard = bookreadboard(book, board)
  if (ispresent(maybeboard)) {
    // ensure player is listed as active
    if (!book.activelist.includes(player)) {
      book.activelist.push(player)
    }
  } else {
    // ensure player is not listed as active
    book.activelist = book.activelist.filter((id) => id !== player)
  }
}

export function bookplayermovetoboard(
  book: MAYBE<BOOK>,
  player: string,
  board: string,
  dest: PT,
) {
  if (!ispresent(book)) {
    return
  }

  // current board
  const currentboard = bookplayerreadboard(book, player)
  if (!ispresent(currentboard)) {
    return
  }

  // player element
  const element = boardobjectread(currentboard, player)
  if (!boardelementisobject(element) || !element?.id) {
    return
  }

  // dest board
  const destboard = bookreadboard(book, board)
  if (!ispresent(destboard)) {
    return
  }

  // make sure lookup is created
  bookboardsetlookup(book, destboard)

  // read target spot
  if (bookboardcheckblockedobject(book, destboard, COLLISION.ISWALK, dest)) {
    return
  }

  // remove from current board
  delete currentboard.objects[element.id]
  const startidx = boardelementindex(currentboard, element)
  if (currentboard.lookup) {
    currentboard.lookup[startidx] = undefined
  }

  // add to dest board
  element.x = dest.x
  element.y = dest.y
  destboard.objects[element.id] = element
  const destidx = boardelementindex(destboard, element)
  if (destboard.lookup) {
    destboard.lookup[destidx] = element.id
  }

  // updating tracking
  bookplayersetboard(book, player, destboard.id)
}

function bookplayerreadboardids(book: MAYBE<BOOK>) {
  const activelist = book?.activelist ?? []
  const boardids = activelist.map((player) => {
    const value = bookreadflag(book, player, 'board')
    return isstring(value) ? value : ''
  })
  return unique(boardids)
}

export function bookplayerreadboards(book: MAYBE<BOOK>) {
  const ids = bookplayerreadboardids(book)
  const addedids = new Set<string>()
  const mainboards: BOARD[] = []
  for (let i = 0; i < ids.length; ++i) {
    const board = bookreadboard(book, ids[i])
    // only process once
    if (ispresent(board) && !addedids.has(board.id)) {
      // see if we have an over board
      // it runs first
      if (isstring(board.over)) {
        if (isstring(board.overboard)) {
          const over = bookreadboard(book, board.overboard)
          if (ispresent(over)) {
            // only add once
            if (!addedids.has(over.id)) {
              mainboards.push(over)
            }
          } else {
            delete board.overboard
          }
        } else {
          // check to see if board.over is a stat
          const boards = bookreadcodepagesbytypeandstat(
            book,
            CODE_PAGE_TYPE.BOARD,
            board.over,
          )
          if (boards.length) {
            const codepage = pick(boards)
            const maybeboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
            if (ispresent(maybeboard)) {
              // update stat, will kick in next cycle
              board.overboard = maybeboard.id
            }
          }
        }
      } else if (isstring(board.overboard)) {
        delete board.overboard
      }

      // followed by the mainboard
      mainboards.push(board)

      // see if we have an under board
      // it is not run
      if (isstring(board.under)) {
        if (isstring(board.underboard)) {
          const under = bookreadboard(book, board.underboard)
          if (!ispresent(under)) {
            delete board.underboard
          }
        } else {
          // check to see if board.under is a stat
          const boards = bookreadcodepagesbytypeandstat(
            book,
            CODE_PAGE_TYPE.BOARD,
            board.under,
          )
          if (boards.length) {
            const codepage = pick(boards)
            const maybeboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
            if (ispresent(maybeboard)) {
              // update stat, will kick in next cycle
              board.underboard = maybeboard.id
            }
          }
        }
      } else if (isstring(board.underboard)) {
        delete board.underboard
      }
    }
  }
  return mainboards
}
