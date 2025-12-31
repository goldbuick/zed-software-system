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

import { memoryapplyboardelementcolor } from './boardelement'
import {
  memoryresetboardlookups,
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from './boardlookup'
import {
  memorycreateboardobjectfromkind,
  memorysetboardterrainfromkind,
} from './boardoperations'
import {
  memoryclearbookflags,
  memorycreatebook,
  memoryensurebookcodepagewithtype,
  memoryhasbookflags,
  memoryreadbookcodepagesbytypeandstat,
  memoryreadbookcodepagessorted,
  memoryreadbookflags,
} from './bookoperations'
import {
  memoryreadcodepagedata,
  memoryreadcodepagestat,
  memoryreadcodepagetype,
} from './codepageoperations'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

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
export function memoryreadloaders() {
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

export function memorywritesoftwarebook(
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
  const book = memorycreatebook([])
  if (isstring(maybename)) {
    book.name = maybename
  }
  memorywritebook(book)
  apilog(SOFTWARE, MEMORY.operator, `created [book] ${book.name}`)
  return book
}

export function memoryensurebookbyname(name: string) {
  let book = memoryreadbookbyaddress(name)
  if (!ispresent(book)) {
    book = memorycreatebook([])
    book.name = name
  }
  memorywritebook(book)
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
  memorywritesoftwarebook(slot, book.id)
  return book
}

export function memoryensuresoftwarecodepage<T extends CODE_PAGE_TYPE>(
  slot: keyof typeof MEMORY.software,
  address: string,
  createtype: T,
) {
  return memoryensurebookcodepagewithtype(
    memoryensuresoftwarebook(slot),
    createtype,
    address,
  )
}

export function memorypickcodepagewithtype<T extends CODE_PAGE_TYPE>(
  type: T,
  address: string,
): MAYBE<CODE_PAGE> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const codepage = pick(
    memoryreadbookcodepagesbytypeandstat(mainbook, type, address),
  )
  if (ispresent(codepage)) {
    return codepage
  }
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      const fallbackcodepage = pick(
        memoryreadbookcodepagesbytypeandstat(book, type, address),
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
  const found = memoryreadbookcodepagessorted(mainbook).filter(
    (codepage) => memoryreadcodepagetype(codepage) === type,
  )
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      found.push(
        ...memoryreadbookcodepagessorted(book).filter(
          (codepage) => memoryreadcodepagetype(codepage) === type,
        ),
      )
    }
  }
  return found
}

export function memoryreadelementkind(
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
    element.kinddata =
      memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(maybeobject)
    return element.kinddata
  }

  const maybeterrain = memorypickcodepagewithtype(
    CODE_PAGE_TYPE.TERRAIN,
    element.kind,
  )
  if (ispresent(maybeterrain)) {
    element.kinddata =
      memoryreadcodepagedata<CODE_PAGE_TYPE.TERRAIN>(maybeterrain)
    return element.kinddata
  }

  return undefined
}

export function memoryreadelementstat(
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
  const codepagestat = memoryreadcodepagestat(codepage, stat)
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

export function memorycheckelementpushable(
  pusher: MAYBE<BOARD_ELEMENT>,
  target: MAYBE<BOARD_ELEMENT>,
) {
  const pusherpt: PT = { x: pusher?.x ?? -1, y: pusher?.y ?? -1 }
  const targetpt: PT = { x: target?.x ?? -1, y: target?.y ?? -1 }
  const pushdir = dirfrompts(pusherpt, targetpt)
  const pushable = memoryreadelementstat(target, 'pushable')
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

export function memorywriteelementfromkind(
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
    const object = memorycreateboardobjectfromkind(board, dest, name, id)
    if (ispresent(object)) {
      memoryapplyboardelementcolor(object, maybecolor)
      // update named (terrain & objects)
      memoryreadelementkind(object)
      memorywriteboardobjectlookup(board, object)
      memorywriteboardnamed(board, object)
      return object
    }
  }

  const maybeterrain = memorypickcodepagewithtype(CODE_PAGE_TYPE.TERRAIN, name)
  if (ispresent(maybeterrain)) {
    const terrain = memorysetboardterrainfromkind(board, dest, name)
    if (ispresent(terrain)) {
      memoryapplyboardelementcolor(terrain, maybecolor)
      // update named (terrain & objects)
      memoryreadelementkind(terrain)
      // calc index
      const idx = pttoindex(dest, BOARD_WIDTH)
      memorywriteboardnamed(board, terrain, idx)
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
    const object = memorycreateboardobjectfromkind(board, dest, name)
    // update color
    memoryapplyboardelementcolor(object, maybecolor)
    return object
  }

  return undefined
}

export function memoryreadboard(address: string): MAYBE<BOARD> {
  const maybeboard = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, address)
  return memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(maybeboard)
}

export function memoryreadoverboard(board: MAYBE<BOARD>): MAYBE<BOARD> {
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
    const maybeover = memoryreadboard(board.overboard)
    if (ispresent(maybeover)) {
      return maybeover
    }
    delete board.overboard
    return undefined
  }
  // no overboard value
  const maybeover = memoryreadboard(board.over)
  if (ispresent(maybeover)) {
    board.overboard = maybeover.id
    return maybeover
  }
  return undefined
}

export function memoryreadunderboard(board: MAYBE<BOARD>): MAYBE<BOARD> {
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
    const maybeunder = memoryreadboard(board.underboard)
    if (ispresent(maybeunder)) {
      return maybeunder
    }
    delete board.underboard
    return undefined
  }
  // no underboard value
  const maybeunder = memoryreadboard(board.under)
  if (ispresent(maybeunder)) {
    board.underboard = maybeunder.id
    return maybeunder
  }
  return undefined
}

export function memoryreadflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return memoryreadbookflags(mainbook, id)
}

export function memoryhasflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return memoryhasbookflags(mainbook, id)
}

export function memoryclearflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return memoryclearbookflags(mainbook, id)
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

export function memorywritebook(book: BOOK) {
  MEMORY.books.set(book.id, book)
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    MEMORY.books.delete(book.id)
  }
}

export function memoryinitboard(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // terrain setup
  for (let i = 0; i < board.terrain.length; ++i) {
    memoryreadelementkind(board.terrain[i])
  }

  // object setup
  const oids = Object.keys(board.objects)
  for (let i = 0; i < oids.length; ++i) {
    const id = oids[i]
    memoryreadelementkind(board.objects[id])
  }

  // force build object lookup pre-tick
  memoryresetboardlookups(board)
}
