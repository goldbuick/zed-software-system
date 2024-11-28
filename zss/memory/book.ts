import { unique } from 'zss/mapping/array'
import { createsid, createnameid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, MAYBE_STRING, ispresent, isstring } from 'zss/mapping/types'
import { CATEGORY, COLLISION, COLOR } from 'zss/words/types'
import { STR_KIND } from 'zss/words/kind'
import { PT, WORD } from 'zss/words/types'

import { checkcollision } from './atomics'
import {
  boarddeleteobject,
  boardelementapplycolor,
  boardobjectcreatefromkind,
  boardobjectread,
  boardterrainsetfromkind,
} from './board'
import {
  codepagereaddata,
  codepagereadname,
  codepagereadstatdefaults,
  codepagereadtype,
  exportcodepage,
  importcodepage,
} from './codepage'
import { FORMAT_OBJECT, formatobject, unformatobject } from './format'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
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
}

export function exportbook(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  return formatobject(book, BOOK_KEYS, {
    pages: (pages) => pages.map(exportcodepage),
  })
}

export function importbook(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  return unformatobject(bookentry, BOOK_KEYS, {
    pages: (pages) => pages.map(importcodepage),
  })
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

  const laddress = address.toLowerCase()
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

  const laddress = address.toLowerCase()
  const codepage = book.pages.find(
    (item) =>
      codepagereadtype(item) === type &&
      (item.id === address || laddress === codepagereadname(item)),
  )

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

  return true
}

export function bookclearcodepage(book: MAYBE<BOOK>, address: string) {
  const codepage = bookreadcodepagebyaddress(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = address.toLowerCase()
    book.pages = book.pages.filter(
      (item) => item.id !== address && laddress !== codepagereadname(item),
    )
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

export function bookelementdisplayread(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
) {
  const kind = bookelementkindread(book, element)
  return {
    char: element?.char ?? kind?.char ?? 1,
    color: element?.color ?? kind?.color ?? COLOR.WHITE,
    bg: element?.bg ?? kind?.bg ?? COLOR.BORROW,
  }
}

export function bookreadobject(
  book: MAYBE<BOOK>,
  maybeobject: MAYBE_STRING,
): MAYBE<BOARD_ELEMENT> {
  const object = maybeobject ?? ''
  const page = bookreadcodepagewithtype(book, CODE_PAGE_TYPE.OBJECT, object)
  if (ispresent(page)) {
    const stats = codepagereadstatdefaults(page)
    const data = codepagereaddata<CODE_PAGE_TYPE.OBJECT>(page)
    const element = {
      ...data,
      ...stats,
      name: object,
      code: page.code,
    }
    return element as BOARD_ELEMENT
  } else {
    return undefined
  }
}

export function bookreadterrain(
  book: MAYBE<BOOK>,
  maybeterrain: MAYBE_STRING,
): MAYBE<BOARD_ELEMENT> {
  const terrain = maybeterrain ?? ''
  const page = bookreadcodepagewithtype(book, CODE_PAGE_TYPE.TERRAIN, terrain)
  if (ispresent(page)) {
    const stats = codepagereadstatdefaults(page)
    const data = codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(page)
    return {
      ...data,
      ...stats,
      name: terrain,
      code: page.code,
    } as BOARD_ELEMENT
  } else {
    return undefined
  }
}

export function bookreadboard(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<BOARD> {
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(
    bookreadcodepagebyaddress(book, address),
  )
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
  return ids.map((address) => bookreadboard(book, address)).filter(ispresent)
}

export function bookboardmoveobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): MAYBE<BOARD_ELEMENT> {
  const object = boardobjectread(board, target?.id ?? '')

  // first pass clipping
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(object) ||
    !ispresent(object.x) ||
    !ispresent(object.y) ||
    !ispresent(board.lookup) ||
    dest.x < 0 ||
    dest.x >= BOARD_WIDTH ||
    dest.y < 0 ||
    dest.y >= BOARD_HEIGHT
  ) {
    // for sending interaction messages
    return { kind: 'edge', collision: COLLISION.ISSOLID, x: dest.x, y: dest.y }
  }

  // second pass, are we actually trying to move ?
  if (object.x - dest.x === 0 && object.y - dest.y === 0) {
    // no interaction due to no movement
    return undefined
  }

  // gather meta for move
  const startidx = object.x + object.y * BOARD_WIDTH
  const targetidx = dest.x + dest.y * BOARD_WIDTH
  const targetkind = bookelementkindread(book, object)
  const targetcollision = object.collision ?? targetkind?.collision

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[targetidx] ?? '')
  if (ispresent(maybeobject)) {
    // for sending interaction messages
    return { ...maybeobject }
  }

  // blocked by terrain
  const mayberterrain = board.terrain[targetidx]
  if (ispresent(mayberterrain)) {
    const terrainkind = bookelementkindread(book, mayberterrain)
    const terraincollision = mayberterrain.collision ?? terrainkind?.collision
    if (checkcollision(targetcollision, terraincollision)) {
      // for sending interaction messages
      return { ...mayberterrain, x: dest.x, y: dest.y } as BOARD_ELEMENT
    }
  }

  // update object location
  object.x = dest.x
  object.y = dest.y

  // if not removed, update lookup
  if (!ispresent(object.removed)) {
    // blank current lookup
    board.lookup[startidx] = undefined
    // update lookup at dest
    board.lookup[targetidx] = object.id ?? ''
  }

  // no interaction
  return undefined
}

export function bookboardelementreadname(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
) {
  const kind = bookelementkindread(book, element)
  if (ispresent(element?.id) && ispresent(element.x) && ispresent(element.y)) {
    return (element.name ?? kind?.name ?? 'object').toLowerCase()
  }
  return (element?.name ?? kind?.name ?? 'terrain').toLowerCase()
}

export function bookboardnamedwrite(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  index?: number,
) {
  // invalid data
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.named) ||
    !ispresent(element)
  ) {
    return
  }
  // update named
  const name = bookboardelementreadname(book, element)
  if (!board.named[name]) {
    board.named[name] = new Set<string>()
  }
  // object.id or terrain index
  board.named[name].add(element?.id ?? index ?? '')
}

export function bookboardobjectlookupwrite(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  // invalid data
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.lookup) ||
    !ispresent(object?.id)
  ) {
    return
  }
  // update object lookup
  if (!ispresent(object.removed)) {
    const x = object.x ?? 0
    const y = object.y ?? 0
    board.lookup[x + y * BOARD_WIDTH] = object.id
  }
}

export function bookboardsetlookup(book: MAYBE<BOOK>, board: MAYBE<BOARD>) {
  // invalid data
  if (!ispresent(book) || !ispresent(board)) {
    return
  }

  // already cached
  if (ispresent(board.lookup) && ispresent(board.named)) {
    return
  }

  // build initial cache
  const lookup: string[] = new Array(BOARD_WIDTH * BOARD_HEIGHT).fill(undefined)
  const named: Record<string, Set<string | number>> = {}

  // add objects to lookup & to named
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (
      ispresent(object.x) &&
      ispresent(object.y) &&
      ispresent(object.id) &&
      !ispresent(object.removed)
    ) {
      // add category
      object.category = CATEGORY.ISOBJECT

      // update lookup
      lookup[object.x + object.y * BOARD_WIDTH] = object.id

      // update named lookup
      const name = bookboardelementreadname(book, object)
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(object.id)
    }
  }

  // add terrain to named
  let x = 0
  let y = 0
  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (ispresent(terrain)) {
      // add coords
      terrain.x = x
      terrain.y = y
      terrain.category = CATEGORY.ISTERRAIN

      // update named lookup
      const name = bookboardelementreadname(book, terrain)
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(i)
    }
    ++x
    if (x >= BOARD_WIDTH) {
      x = 0
      ++y
    }
  }

  board.lookup = lookup
  board.named = named
}

export function bookboardobjectsafedelete(
  book: MAYBE<BOOK>,
  object: MAYBE<BOARD_ELEMENT>,
  timestamp: number,
) {
  const name = bookboardelementreadname(book, object)
  if (name !== 'player' && ispresent(object)) {
    // mark for cleanup
    object.removed = timestamp
    return true
  }
  return false
}

export function bookboardobjectnamedlookupdelete(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(book) && ispresent(board) && ispresent(object?.id)) {
    // remove from lookup
    if (ispresent(board.lookup) && ispresent(object.x) && ispresent(object.y)) {
      const index = object.x + object.y * BOARD_WIDTH
      if (board.lookup[index] === object.id) {
        delete board.lookup[index]
      }
    }
    // remove from named
    const name = bookboardelementreadname(book, object)
    if (ispresent(board.named?.[name]) && ispresent(object.id)) {
      board.named[name].delete(object.id)
    }
  }
}

function bookboardcleanup(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  timestamp: number,
) {
  const ids: string[] = []
  if (!ispresent(book) || !ispresent(board)) {
    return ids
  }
  // iterate through objects
  const targets = Object.values(board.objects)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    // check that we have an id and are marked for removal
    // 5 seconds after marked for removal
    if (
      ispresent(target.id) &&
      ispresent(target.removed) &&
      timestamp - target.removed > TICK_FPS * 5
    ) {
      // track dropped ids
      ids.push(target.id)
      // drop from board
      boarddeleteobject(board, target.id)
    }
  }
  return ids
}

type BOOK_RUN_CODE_TARGETS = {
  object: MAYBE<BOARD_ELEMENT>
  terrain: MAYBE<BOARD_ELEMENT>
}

type BOOK_RUN_CODE = {
  id: string
  code: string
  type: CODE_PAGE_TYPE
}

export type BOOK_RUN_ARGS = BOOK_RUN_CODE_TARGETS & BOOK_RUN_CODE

export function bookboardtick(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  timestamp: number,
) {
  const args: BOOK_RUN_ARGS[] = []

  if (!ispresent(book) || !ispresent(board)) {
    return args
  }

  // force build object lookup pre-tick
  board.lookup = undefined
  bookboardsetlookup(book, board)

  // iterate through objects
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]

    // check that we have an id
    if (!ispresent(object.id)) {
      continue
    }

    // track last position
    object.lx = object.x
    object.ly = object.y

    // lookup kind
    const kind = bookelementkindread(book, object)

    // object code
    const code = object.code ?? kind?.code ?? ''

    // check that we have code to execute
    if (!code) {
      continue
    }

    // signal id & code
    args.push({
      id: object.id,
      type: CODE_PAGE_TYPE.OBJECT,
      code,
      object,
      terrain: undefined,
    })
  }

  // cleanup objects flagged for deletion
  const stopids = bookboardcleanup(book, board, timestamp)
  for (let i = 0; i < stopids.length; ++i) {
    args.push({
      id: stopids[i],
      type: CODE_PAGE_TYPE.ERROR,
      code: '',
      object: undefined,
      terrain: undefined,
    })
  }

  // return code that needs to be run
  return args
}

export function bookboardwriteheadlessobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
) {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind
    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      // create new object element
      const object = boardobjectcreatefromkind(board, dest, name)
      if (ispresent(object)) {
        // mark as headless
        object.headless = true
        // update color
        boardelementapplycolor(object, maybecolor)
        // update named (terrain & objects)
        bookboardnamedwrite(book, board, object)
      }
      // return result
      return object
    }
  }
  return undefined
}

export function bookboardwrite(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
): MAYBE<BOARD_ELEMENT> {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind

    const maybeterrain = bookreadterrain(book, name)
    if (ispresent(maybeterrain)) {
      // create new terrain element
      const terrain = boardterrainsetfromkind(board, dest, name)
      // update color
      boardelementapplycolor(terrain, maybecolor)
      // update named (terrain & objects)
      const index = dest.x + dest.y * BOARD_WIDTH
      bookboardnamedwrite(book, board, terrain, index)
      // return result
      return terrain
    }

    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      // create new object element
      const object = boardobjectcreatefromkind(board, dest, name)
      // update color
      boardelementapplycolor(object, maybecolor)
      // update lookup (only objects)
      bookboardobjectlookupwrite(book, board, object)
      // update named (terrain & objects)
      bookboardnamedwrite(book, board, object)
      // return result
      return object
    }
  }
  return undefined
}
