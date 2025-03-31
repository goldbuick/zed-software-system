import { pttoindex } from 'zss/mapping/2d'
import { unique } from 'zss/mapping/array'
import { createsid, createnameid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, deepcopy, ispresent, isstring } from 'zss/mapping/types'
import { STR_KIND } from 'zss/words/kind'
import { CATEGORY, COLLISION, NAME, PT, WORD } from 'zss/words/types'

import { checkdoescollide } from './atomics'
import {
  boarddeleteobject,
  boardelementindex,
  boardelementread,
  boardobjectcreatefromkind,
  boardobjectread,
  boardsetterrain,
  boardterrainsetfromkind,
} from './board'
import {
  boardelementapplycolor,
  boardelementisobject,
  boardelementname,
} from './boardelement'
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
  BOARD_HEIGHT,
  BOARD_WIDTH,
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
      return maybename === codepagename || ispresent(stats[statname])
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

  return true
}

export function bookclearcodepage(book: MAYBE<BOOK>, address: string) {
  const codepage = bookreadcodepagebyaddress(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = NAME(address)
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

export function bookelementstatread(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
  stat: BOARD_ELEMENT_STAT,
) {
  const kind = bookelementkindread(book, element)
  return element?.[stat] ?? kind?.[stat]
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
  return ids.map((address) => bookreadboard(book, address)).filter(ispresent)
}

export function bookboardcheckblockedobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  collision: MAYBE<COLLISION>,
  dest: PT,
): boolean {
  // first pass clipping
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.lookup) ||
    dest.x < 0 ||
    dest.x >= BOARD_WIDTH ||
    dest.y < 0 ||
    dest.y >= BOARD_HEIGHT
  ) {
    return true
  }

  // gather meta for move
  const targetidx = dest.x + dest.y * BOARD_WIDTH

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[targetidx] ?? '404')
  if (ispresent(maybeobject)) {
    // for sending interaction messages
    return true
  }

  // blocked by terrain
  const mayberterrain = board.terrain[targetidx]
  if (ispresent(mayberterrain)) {
    const terrainkind = bookelementkindread(book, mayberterrain)
    const terraincollision = mayberterrain.collision ?? terrainkind?.collision
    return checkdoescollide(collision, terraincollision)
  }

  return false
}

export function bookboardcheckmoveobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): boolean {
  const object = boardobjectread(board, target?.id ?? '')
  const objectx = object?.x ?? -1
  const objecty = object?.y ?? -1
  // first pass, are we actually trying to move ?
  if (objectx - dest.x === 0 && objecty - dest.y === 0) {
    // no interaction due to no movement
    return true
  }
  const collsion = bookelementstatread(book, object, 'collision')
  return bookboardcheckblockedobject(book, board, collsion, dest)
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
    return {
      name: 'edge',
      kind: 'edge',
      collision: COLLISION.ISSOLID,
      x: dest.x,
      y: dest.y,
    }
  }

  // second pass, are we actually trying to move ?
  if (object.x - dest.x === 0 && object.y - dest.y === 0) {
    // no interaction due to no movement
    return undefined
  }

  // gather meta for move
  const startidx = boardelementindex(board, object)
  const targetidx = boardelementindex(board, dest)
  const targetcollision =
    object.collision ?? object?.kinddata?.collision ?? COLLISION.ISWALK

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[targetidx] ?? '')
  if (ispresent(maybeobject)) {
    // for sending interaction messages
    return { ...maybeobject }
  }

  // blocked by terrain
  const mayberterrain = board.terrain[targetidx]
  if (ispresent(mayberterrain)) {
    const terraincollision =
      mayberterrain.collision ??
      mayberterrain?.kinddata?.collision ??
      COLLISION.ISWALK
    if (checkdoescollide(targetcollision, terraincollision)) {
      // for sending interaction messages
      return { ...mayberterrain, x: dest.x, y: dest.y }
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
  const name = NAME(element.name ?? element.kinddata?.name ?? '')
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
      const name = NAME(object.name ?? object.kinddata?.name ?? '')
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
      const name = boardelementname(terrain)
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

export function bookboardsafedelete(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  timestamp: number,
) {
  if (!ispresent(element) || boardelementname(element) === 'player') {
    return false
  }

  if (element.id) {
    // mark for cleanup
    element.removed = timestamp
    // drop from luts
    bookboardobjectnamedlookupdelete(book, board, element)
  } else {
    boardsetterrain(board, {
      x: element?.x ?? 0,
      y: element?.y ?? 0,
    })
    // drop from luts
    bookboardterrainnameddelete(book, board, element)
  }

  return true
}

export function bookboardterrainnameddelete(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  terrain: MAYBE<BOARD_ELEMENT>,
) {
  if (
    ispresent(book) &&
    ispresent(board) &&
    ispresent(terrain?.x) &&
    ispresent(terrain.y)
  ) {
    // remove from named
    const name = boardelementname(terrain)
    const index = boardelementindex(board, terrain)
    if (ispresent(board.named?.[name])) {
      board.named[name].delete(index)
    }
  }
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
        board.lookup[index] = undefined
      }
    }
    // remove from named
    const name = boardelementname(object)
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
    if (ispresent(target.id) && ispresent(target.removed)) {
      const delta = timestamp - target.removed
      if (delta > TICK_FPS * 5) {
        // track dropped ids
        ids.push(target.id)
        // drop from board
        boarddeleteobject(board, target.id)
      }
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

export function bookboardwritebulletobject(
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
      // update color
      boardelementapplycolor(object, maybecolor)
      // skip lookup for bullets, will get set after first tick
      // update named (terrain & objects)
      // bookboardnamedwrite(book, board, object)
      // return result
      return object
    }
  }
  return undefined
}

export function bookboardwritefromkind(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind

    const maybeterrain = bookreadterrain(book, name)
    if (ispresent(maybeterrain)) {
      const terrain = boardterrainsetfromkind(board, dest, name)
      if (ispresent(terrain)) {
        boardelementapplycolor(terrain, maybecolor)
        // update named (terrain & objects)
        const idx = pttoindex(dest, BOARD_WIDTH)
        bookboardnamedwrite(book, board, terrain, idx)
        return terrain
      }
    }

    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      const object = boardobjectcreatefromkind(board, dest, name, id)
      if (ispresent(object)) {
        boardelementapplycolor(object, maybecolor)
        // update lookup (only objects)
        bookboardobjectlookupwrite(book, board, object)
        // update named (terrain & objects)
        bookboardnamedwrite(book, board, object)
        return object
      }
    }
  }

  return undefined
}
