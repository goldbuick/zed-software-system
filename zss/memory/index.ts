import { apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { pttoindex } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { CYCLE_DEFAULT } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { dirfrompts, mapstrdir, mapstrdirtoconst } from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { COLLISION, NAME, PT } from 'zss/words/types'

import { boardelementapplycolor } from './boardelement'
import {
  boardnamedwrite,
  boardobjectlookupwrite,
  boardresetlookups,
} from './boardlookup'
import {
  boardobjectcreatefromkind,
  boardterrainsetfromkind,
} from './boardoperations'
import {
  bookclearflags,
  bookensurecodepagewithtype,
  bookhasflags,
  bookreadcodepagesbytypeandstat,
  bookreadflags,
  bookreadsortedcodepages,
  createbook,
} from './bookoperations'
import {
  codepagereaddata,
  codepagereadstat,
  codepagereadtype,
} from './codepageoperations'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

// Re-export functions from other modules
export {
  memorycli,
  memoryclirepeatlast,
  memoryrun,
  memoryresetchipafteredit,
  memoryrestartallchipsandflags,
  memoryscrollunlock,
  memorystartloader,
  memorycleanup,
} from './cliruntime'
export {
  memoryreadplayerboard,
  memoryreadplayeractive,
  memoryplayerlogin,
  memoryplayerlogout,
  memoryplayerscan,
} from './playermanagement'
export { memorytick, memorytickobject } from './gameloop'
export { memorymessage, memorysendtoboards } from './gameloop'
export { memorymoveobject } from './boardmovement'
export { memoryreadgadgetlayers, type MEMORY_GADGET_LAYERS } from './rendering'

export enum MEMORY_LABEL {
  MAIN = 'main',
  TEMP = 'temp',
  TITLE = 'title',
  PLAYER = 'player',
  GADGETSTORE = 'gadgetstore',
}

const MEMORY = {
  // halting state
  halt: false,
  // unique id for messages
  session: createsid(),
  // player id in charge of vm
  operator: '',
  // active software
  software: {
    main: '',
    temp: '',
  },
  books: new Map<string, BOOK>(),
  // running loaders
  loaders: new Map<string, string>(),
  // active multiplayer session
  topic: '',
}

// Internal getter for loader.ts
export function memorygetloaders() {
  return MEMORY.loaders
}

export function memoryreadsession() {
  return MEMORY.session
}

export function memoryreadoperator() {
  return MEMORY.operator
}

export function memoryisoperator(player: string) {
  return MEMORY.operator === player
}

export function memorywriteoperator(operator: string) {
  MEMORY.operator = operator
}

export function memoryreadtopic() {
  return MEMORY.topic
}

export function memorywritetopic(topic: string) {
  MEMORY.topic = topic
}

export function memorywritehalt(halt: boolean) {
  MEMORY.halt = halt
}

export function memoryreadhalt() {
  return MEMORY.halt
}

export function memoryreadbooklist(): BOOK[] {
  return [...MEMORY.books.values()]
}

export function memoryreadfirstbook(): MAYBE<BOOK> {
  const [first] = MEMORY.books.values()
  return first
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export function memoryreadbookbyaddress(address: string): MAYBE<BOOK> {
  const laddress = NAME(address)
  return (
    MEMORY.books.get(address) ??
    memoryreadbooklist().find((item) => item.name === laddress)
  )
}

export function memorysetsoftwarebook(
  slot: keyof typeof MEMORY.software,
  book: string,
) {
  // validate book
  if (ispresent(memoryreadbookbyaddress(book))) {
    MEMORY.software[slot] = book
  }
}

export function memoryreadbookbysoftware(
  slot: keyof typeof MEMORY.software,
): MAYBE<BOOK> {
  return memoryreadbookbyaddress(MEMORY.software[slot])
}

export function memorycreatesoftwarebook(maybename?: string) {
  const book = createbook([])
  if (isstring(maybename)) {
    book.name = maybename
  }
  memorysetbook(book)
  apilog(SOFTWARE, MEMORY.operator, `created [book] ${book.name}`)
  return book
}

export function memoryensurebookbyname(name: string) {
  let book = memoryreadbookbyaddress(name)
  if (!ispresent(book)) {
    book = createbook([])
    book.name = name
  }
  memorysetbook(book)
  apilog(SOFTWARE, MEMORY.operator, `created [book] ${book.name}`)
  return book
}

export function memoryensuresoftwarebook(
  slot: keyof typeof MEMORY.software,
  maybename?: string,
) {
  let book = ispresent(maybename)
    ? memoryensurebookbyname(maybename)
    : memoryreadbookbysoftware(slot)

  // book not found
  if (!ispresent(book)) {
    // try first book
    if (!ispresent(book)) {
      book = memoryreadfirstbook()
    }

    // create book
    if (!ispresent(book)) {
      book = memorycreatesoftwarebook(maybename)
    }

    // success
    if (ispresent(book)) {
      apilog(
        SOFTWARE,
        MEMORY.operator,
        `opened [book] ${book.name} for ${slot}`,
      )
    }
  }

  // make sure slot is set
  memorysetsoftwarebook(slot, book.id)
  return book
}

export function memoryensuresoftwarecodepage<T extends CODE_PAGE_TYPE>(
  slot: keyof typeof MEMORY.software,
  address: string,
  createtype: T,
) {
  return bookensurecodepagewithtype(
    memoryensuresoftwarebook(slot),
    createtype,
    address,
  )
}

/*
when we list pages,
 we list all pages, from all books
when we list boards, do the same
will have to add in the pickstats support here as well

*/

export function memorypickcodepagewithtype<T extends CODE_PAGE_TYPE>(
  type: T,
  address: string,
): MAYBE<CODE_PAGE> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const codepage = pick(bookreadcodepagesbytypeandstat(mainbook, type, address))
  if (ispresent(codepage)) {
    return codepage
  }
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      const fallbackcodepage = pick(
        bookreadcodepagesbytypeandstat(book, type, address),
      )
      if (ispresent(fallbackcodepage)) {
        return fallbackcodepage
      }
    }
  }
  return undefined
}

export function memorylistcodepagewithtype<T extends CODE_PAGE_TYPE>(
  type: T,
): CODE_PAGE[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const found = bookreadsortedcodepages(mainbook).filter(
    (codepage) => codepagereadtype(codepage) === type,
  )
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      found.push(
        ...bookreadsortedcodepages(book).filter(
          (codepage) => codepagereadtype(codepage) === type,
        ),
      )
    }
  }
  return found
}

export function memoryelementkindread(
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (ispresent(element?.kinddata)) {
    return element.kinddata
  }

  if (!isstring(element?.kind) || !element.kind) {
    return undefined
  }

  const maybeobject = memorypickcodepagewithtype(
    CODE_PAGE_TYPE.OBJECT,
    element.kind,
  )
  if (ispresent(maybeobject)) {
    element.kinddata = codepagereaddata<CODE_PAGE_TYPE.OBJECT>(maybeobject)
    return element.kinddata
  }

  const maybeterrain = memorypickcodepagewithtype(
    CODE_PAGE_TYPE.TERRAIN,
    element.kind,
  )
  if (ispresent(maybeterrain)) {
    element.kinddata = codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(maybeterrain)
    return element.kinddata
  }

  return undefined
}

export function memoryelementstatread(
  element: MAYBE<BOARD_ELEMENT>,
  stat: BOARD_ELEMENT_STAT | 'sky',
) {
  const kind = element?.kinddata
  const kindid = kind?.id ?? ''

  const elementstat = element?.[stat as keyof BOARD_ELEMENT]
  if (ispresent(elementstat)) {
    return elementstat
  }

  const kindstat = kind?.[stat as keyof BOARD_ELEMENT]
  if (ispresent(kindstat)) {
    return kindstat
  }

  const codepage =
    memorypickcodepagewithtype(CODE_PAGE_TYPE.OBJECT, kindid) ??
    memorypickcodepagewithtype(CODE_PAGE_TYPE.TERRAIN, kindid)
  const codepagestat = codepagereadstat(codepage, stat)
  if (ispresent(codepagestat)) {
    return codepagestat
  }

  // we define all stat defaults here
  switch (stat) {
    case 'group':
      return ''
    case 'cycle':
      return CYCLE_DEFAULT
    case 'p1':
    case 'p2':
    case 'p3':
    case 'p4':
    case 'p5':
    case 'p6':
    case 'p7':
    case 'p8':
    case 'p9':
    case 'p10':
    case 'item':
    case 'pushable':
    case 'breakable':
      return 0
    case 'collision':
      return COLLISION.ISWALK
    default:
      return undefined
  }
}

export function memoryelementcheckpushable(
  pusher: MAYBE<BOARD_ELEMENT>,
  target: MAYBE<BOARD_ELEMENT>,
) {
  const pusherpt: PT = { x: pusher?.x ?? -1, y: pusher?.y ?? -1 }
  const targetpt: PT = { x: target?.x ?? -1, y: target?.y ?? -1 }
  const pushdir = dirfrompts(pusherpt, targetpt)
  const pushable = memoryelementstatread(target, 'pushable')
  if (isnumber(pushable)) {
    return pushable !== 0
  }
  if (isstring(pushable)) {
    return pushable
      .trim()
      .split(' ')
      .map((str) => mapstrdirtoconst(mapstrdir(str)))
      .some((dir) => dir === pushdir)
  }
  return false
}

export function memorywritefromkind(
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(kind)) {
    return undefined
  }
  const [name, maybecolor] = kind

  const maybeobject = memorypickcodepagewithtype(CODE_PAGE_TYPE.OBJECT, name)
  if (ispresent(maybeobject)) {
    const object = boardobjectcreatefromkind(board, dest, name, id)
    if (ispresent(object)) {
      boardelementapplycolor(object, maybecolor)
      // update named (terrain & objects)
      memoryelementkindread(object)
      boardobjectlookupwrite(board, object)
      boardnamedwrite(board, object)
      return object
    }
  }

  const maybeterrain = memorypickcodepagewithtype(CODE_PAGE_TYPE.TERRAIN, name)
  if (ispresent(maybeterrain)) {
    const terrain = boardterrainsetfromkind(board, dest, name)
    if (ispresent(terrain)) {
      boardelementapplycolor(terrain, maybecolor)
      // update named (terrain & objects)
      memoryelementkindread(terrain)
      // calc index
      const idx = pttoindex(dest, BOARD_WIDTH)
      boardnamedwrite(board, terrain, idx)
      return terrain
    }
  }

  return undefined
}

export function memorywritebullet(
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
) {
  if (!ispresent(board) || !ispresent(kind)) {
    return undefined
  }
  const [name, maybecolor] = kind

  const maybeobject = memorypickcodepagewithtype(CODE_PAGE_TYPE.OBJECT, name)
  if (ispresent(maybeobject)) {
    // create new object element
    const object = boardobjectcreatefromkind(board, dest, name)
    // update color
    boardelementapplycolor(object, maybecolor)
    return object
  }

  return undefined
}

export function memoryboardread(address: string): MAYBE<BOARD> {
  const maybeboard = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, address)
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(maybeboard)
}

export function memoryoverboardread(board: MAYBE<BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  // no over stat
  if (!isstring(board.over)) {
    delete board.overboard
    return undefined
  }
  // validate overboard value
  if (isstring(board.overboard)) {
    const maybeover = memoryboardread(board.overboard)
    if (ispresent(maybeover)) {
      return maybeover
    }
    delete board.overboard
    return undefined
  }
  // no overboard value
  const maybeover = memoryboardread(board.over)
  if (ispresent(maybeover)) {
    board.overboard = maybeover.id
    return maybeover
  }
  return undefined
}

export function memoryunderboardread(board: MAYBE<BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  // no under stat
  if (!isstring(board.under)) {
    delete board.underboard
    return undefined
  }
  // validate underboard value
  if (isstring(board.underboard)) {
    const maybeunder = memoryboardread(board.underboard)
    if (ispresent(maybeunder)) {
      return maybeunder
    }
    delete board.underboard
    return undefined
  }
  // no underboard value
  const maybeunder = memoryboardread(board.under)
  if (ispresent(maybeunder)) {
    board.underboard = maybeunder.id
    return maybeunder
  }
  return undefined
}

export function memoryreadflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookreadflags(mainbook, id)
}

export function memoryhasflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookhasflags(mainbook, id)
}

export function memoryclearflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookclearflags(mainbook, id)
}

export function memoryresetbooks(books: BOOK[]) {
  // clear all books
  MEMORY.books.clear()

  // add new books
  books.forEach((book) => {
    MEMORY.books.set(book.id, book)
    // attempt default for main
    if (book.name === 'main') {
      MEMORY.software.main = book.id
    }
  })

  // select first book as main
  if (!MEMORY.software.main) {
    const first = MEMORY.books.values().next()
    if (first.value) {
      MEMORY.software.main = first.value.id
    }
  }
}

export function memorysetbook(book: BOOK) {
  MEMORY.books.set(book.id, book)
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    MEMORY.books.delete(book.id)
  }
}

// Player Management functions moved to player.ts
// Messaging functions moved to send.ts

// Movement & Collision functions moved to boardops.ts

// Game Loop & Execution functions moved to tick.ts
// System Operations functions moved to system.ts

export function memoryboardinit(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // terrain setup
  for (let i = 0; i < board.terrain.length; ++i) {
    memoryelementkindread(board.terrain[i])
  }

  // object setup
  const oids = Object.keys(board.objects)
  for (let i = 0; i < oids.length; ++i) {
    const id = oids[i]
    memoryelementkindread(board.objects[id])
  }

  // force build object lookup pre-tick
  boardresetlookups(board)
}

// memorytick moved to tick.ts

// CLI & Runtime functions moved to cli.ts
// System Operations functions moved to system.ts

// Rendering & Gadget Conversion functions moved to rendertogadget.ts
