import { objectKeys } from 'ts-extras'
import { senderid } from 'zss/chip'
import { RUNTIME } from 'zss/config'
import { api_error, MESSAGE, api_log } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { LAYER } from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid, ispid } from 'zss/mapping/guid'
import { CYCLE_DEFAULT, TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { ispt } from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import { listelementsbyidnameorpts } from './atomics'
import {
  boarddeleteobject,
  boardelementread,
  boardobjectcreatefromkind,
  boardobjectread,
  boardsafedelete,
  boardsetterrain,
  boardterrainsetfromkind,
} from './board'
import { boardelementapplycolor } from './boardelement'
import {
  boardnamedwrite,
  boardobjectlookupwrite,
  boardobjectnamedlookupdelete,
} from './boardlookup'
import { boardmoveobject, boardtick } from './boardops'
import {
  bookclearflags,
  bookelementdisplayread,
  bookensurecodepagewithtype,
  bookhasflags,
  bookreadcodepagebyaddress,
  bookreadcodepagesbytypeandstat,
  bookreadflags,
  createbook,
} from './book'
import {
  bookplayermovetoboard,
  bookplayerreadactive,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
} from './bookplayer'
import { codepagereaddata, codepagereadstat } from './codepage'
import { memoryloaderarg } from './loader'
import { memoryconverttogadgetlayers } from './rendertogadget'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

// manages chips
const os = createos()

export enum MEMORY_LABEL {
  MAIN = 'main',
  TITLE = 'title',
  PLAYER = 'player',
  GADGETSTORE = 'gadgetstore',
  GADGETSYNC = 'gadgetsync',
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
    content: '',
  },
  books: new Map<string, BOOK>(),
  // running code
  chips: new Map<string, string>(),
  loaders: new Map<string, string>(),
}

export function memoryreadsession() {
  return MEMORY.session
}

export function memoryreadoperator() {
  return MEMORY.operator
}

export function memorywriteoperator(operator: string) {
  MEMORY.operator = operator
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
  api_log(SOFTWARE, MEMORY.operator, `created [book] ${book.name}`)
  return book
}

export function memoryensurebookbyname(name: string) {
  let book = memoryreadbookbyaddress(name)
  if (!ispresent(book)) {
    book = createbook([])
    book.name = name
  }
  memorysetbook(book)
  api_log(SOFTWARE, MEMORY.operator, `created [book] ${book.name}`)
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
      api_log(
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
  stat: BOARD_ELEMENT_STAT,
) {
  const kind = element?.kinddata
  const kindid = kind?.id ?? ''

  const elementstat = element?.[stat]
  if (ispresent(elementstat)) {
    return elementstat
  }

  const kindstat = kind?.[stat]
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
    case 'item':
      return 0
    case 'pushable':
      return 0
    case 'breakable':
      return 0
    case 'collision':
      return COLLISION.ISWALK
    default:
      return undefined
  }
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
      // update lookup (only objects)
      boardobjectlookupwrite(board, object)
      // update named (terrain & objects)
      memoryelementkindread(object)
      boardnamedwrite(board, object)
      return object
    }
  }

  const maybeterrain = memorypickcodepagewithtype(CODE_PAGE_TYPE.TERRAIN, name)
  if (ispresent(maybeterrain)) {
    const terrain = boardterrainsetfromkind(board, dest, name)
    if (ispresent(terrain)) {
      boardelementapplycolor(terrain, maybecolor)
      // calc index
      const idx = pttoindex(dest, BOARD_WIDTH)
      // update named (terrain & objects)
      memoryelementkindread(terrain)
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

export function memoryreadflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookreadflags(mainbook, id)
}

export function memoryhasflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookhasflags(mainbook, id)
}

export function memoryreadbookflags() {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookreadflags(mainbook, MEMORY_LABEL.MAIN)
}

export function memoryclearflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookclearflags(mainbook, id)
}

export function memoryresetbooks(books: BOOK[], select: string) {
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

  // try select
  const book = memoryreadbookbyaddress(select)
  if (ispresent(book)) {
    MEMORY.software.main = book.id
  }

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

export function memoryplayerlogin(player: string): boolean {
  if (!isstring(player) || !player) {
    return api_error(
      SOFTWARE,
      player,
      'login',
      `failed for playerid ==>${player}<==`,
    )
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return api_error(
      SOFTWARE,
      player,
      'login:main',
      `login failed to find book 'main'`,
      'login',
      `failed for playerid ==>${player}<==`,
    )
  }

  // try to find existing element
  const currentboard = memoryreadplayerboard(player)

  // place on a title board
  const titleboardpage = memorypickcodepagewithtype(
    CODE_PAGE_TYPE.BOARD,
    MEMORY_LABEL.TITLE,
  )

  if (!ispresent(currentboard) && !ispresent(titleboardpage)) {
    return api_error(
      SOFTWARE,
      player,
      'login:title',
      `login failed to find board with '${MEMORY_LABEL.TITLE}' stat`,
    )
  }

  const playerkind = memorypickcodepagewithtype(
    CODE_PAGE_TYPE.OBJECT,
    MEMORY_LABEL.PLAYER,
  )
  if (!ispresent(playerkind)) {
    return api_error(
      SOFTWARE,
      player,
      'login:player',
      `login failed to find object type '${MEMORY_LABEL.PLAYER}'`,
    )
  }

  const titleboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(titleboardpage)
  if (ispresent(titleboard)) {
    const startx = codepagereadstat(titleboardpage, 'startx')
    const starty = codepagereadstat(titleboardpage, 'starty')
    const px = isnumber(startx) ? startx : Math.round(BOARD_WIDTH * 0.5)
    const py = isnumber(starty) ? starty : Math.round(BOARD_HEIGHT * 0.5)
    const obj = boardobjectcreatefromkind(
      titleboard,
      {
        x: px,
        y: py,
      },
      MEMORY_LABEL.PLAYER,
      player,
    )
    if (ispresent(obj?.id)) {
      // all players self-aggro
      obj.player = player
      // track current board
      bookplayersetboard(mainbook, player, titleboard.id)
      return true
    }
  }

  return false
}

export function memoryplayerlogout(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const board = bookplayerreadboard(mainbook, player)
  if (!ispresent(mainbook)) {
    return
  }

  const removelist: string[] = [player]
  for (let i = 0; i < mainbook.activelist.length; ++i) {
    const mayberemove = mainbook.activelist[i]
    if (mayberemove.startsWith(player)) {
      removelist.push(mayberemove)
    }
  }

  for (let i = 0; i < removelist.length; ++i) {
    const remove = removelist[i]
    // clear from active list
    bookplayersetboard(mainbook, remove, '')

    // clear element
    boardobjectnamedlookupdelete(board, boardobjectread(board, remove))
    boarddeleteobject(board, remove)

    // halt chip
    os.halt(remove)

    // clear memory
    bookclearflags(mainbook, remove)
  }
}

export function memoryreadplayerboard(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return bookplayerreadboard(mainbook, player)
}

export function memoryreadplayeractive(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const isactive = bookplayerreadactive(mainbook, player)
  const board = bookplayerreadboard(mainbook, player)
  const playerelement = boardobjectread(board, player)
  return isactive && ispresent(playerelement)
}

export function memoryplayerscan(players: Record<string, number>) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const boards = bookplayerreadboards(mainbook)
  for (let i = 0; i < boards.length; ++i) {
    const board = boards[i]
    const objects = Object.keys(board.objects)
    for (let o = 0; o < objects.length; ++o) {
      const object = board.objects[objects[o]]
      const objectid = object.id
      if (ispid(objectid) && ispresent(players[objectid]) === false) {
        players[objectid] = 0
        bookplayersetboard(mainbook, objectid, board.id)
      }
    }
  }
}

export function memorymessage(message: MESSAGE) {
  os.message(message)
}

function sendinteraction(
  player: string,
  fromelement: BOARD_ELEMENT,
  toelement: BOARD_ELEMENT,
  message: string,
) {
  const display = bookelementdisplayread(fromelement)
  if (isstring(toelement.id)) {
    SOFTWARE.emit(player, `vm:touched`, [toelement.id, display.name, message])
  }
}

function playerblockedbyedge(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: BOARD_ELEMENT,
  dest: PT,
) {
  const elementid = element.id ?? ''
  // attempt to move player
  if (dest.x < 0) {
    // exit west
    const destboard = memoryboardread(board?.exitwest ?? '')
    if (ispresent(destboard)) {
      bookplayermovetoboard(book, elementid, destboard.id, {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      })
    }
  } else if (dest.x >= BOARD_WIDTH) {
    // exit east
    const destboard = memoryboardread(board?.exiteast ?? '')
    if (ispresent(destboard)) {
      bookplayermovetoboard(book, elementid, destboard.id, {
        x: 0,
        y: dest.y,
      })
    }
  } else if (dest.y < 0) {
    // exit north
    const destboard = memoryboardread(board?.exitnorth ?? '')
    if (ispresent(destboard)) {
      bookplayermovetoboard(book, elementid, destboard.id, {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      })
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    // exit south
    const destboard = memoryboardread(board?.exitsouth ?? '')
    if (ispresent(destboard)) {
      bookplayermovetoboard(book, elementid, destboard.id, {
        x: dest.x,
        y: 0,
      })
    }
  }
}

export function memorymoveobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  dest: PT,
) {
  if (!ispresent(element?.id)) {
    return false
  }

  const blocked = boardmoveobject(board, element, dest)
  if (ispresent(blocked)) {
    const elementisplayer = ispid(element.id)
    const elementpartyisplayer = ispid(element.party ?? element.id)
    const elementisbullet =
      memoryelementstatread(element, 'collision') === COLLISION.ISBULLET

    let elementplayer = ''
    if (element.party && elementpartyisplayer) {
      elementplayer = element.party
    }
    if (elementisplayer) {
      elementplayer = element.id
    }

    const blockedbyplayer = ispid(blocked.id)
    const blockedpartyisplayer = ispid(blocked.party ?? blocked.id)
    const blockedisbullet =
      memoryelementstatread(blocked, 'collision') === COLLISION.ISBULLET

    const samemparty = elementpartyisplayer === blockedpartyisplayer

    let blockedplayer = ''
    if (blocked.party && blockedpartyisplayer) {
      blockedplayer = blocked.party
    }
    if (blockedbyplayer) {
      blockedplayer = blocked.id ?? ''
    }

    if (elementisplayer && blocked.kind === 'edge') {
      playerblockedbyedge(book, board, element, dest)
    } else if (elementisplayer) {
      if (blockedbyplayer) {
        // same party touch
        sendinteraction('', blocked, element, 'bump')
        sendinteraction('', element, blocked, 'bump')
      } else if (blockedisbullet) {
        sendinteraction('', blocked, element, samemparty ? 'partyshot' : 'shot')
        sendinteraction(elementplayer, element, blocked, 'touch')
      } else {
        sendinteraction('', blocked, element, 'thud')
        sendinteraction(elementplayer, element, blocked, 'touch')
      }
    } else if (elementisbullet) {
      if (blockedisbullet) {
        sendinteraction('', blocked, element, 'thud')
        sendinteraction('', element, blocked, 'thud')
      } else {
        sendinteraction(
          '',
          blocked,
          element,
          blockedbyplayer ? 'touch' : 'thud',
        )
        sendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          samemparty ? 'partyshot' : 'shot',
        )
      }
    } else {
      if (blockedbyplayer) {
        sendinteraction(blockedplayer, blocked, element, 'touch')
      } else if (blockedisbullet) {
        sendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          samemparty ? 'partyshot' : 'shot',
        )
        sendinteraction('', element, blocked, samemparty ? 'thud' : 'touch')
      } else {
        sendinteraction('', blocked, element, 'thud')
        // same party touch
        sendinteraction('', element, blocked, 'bump')
      }
    }

    // delete breakable elements
    if (elementisbullet && memoryelementstatread(blocked, 'breakable')) {
      if (ispresent(blocked?.id)) {
        const maybeobject = boardelementread(board, {
          x: blocked.x ?? -1,
          y: blocked.y ?? -1,
        })
        if (ispresent(maybeobject)) {
          // mark target for deletion
          boardsafedelete(
            READ_CONTEXT.board,
            maybeobject,
            READ_CONTEXT.timestamp,
          )
        }
      } else {
        // overwrite terrain with empty
        boardsetterrain(board, { x: dest.x, y: dest.y })
      }

      //
      return true
    }

    // blocked
    return false
  }

  // we are allowed to move!
  return true
}

export function memorytickobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
  code: string,
) {
  if (!ispresent(book) || !ispresent(board) || !ispresent(object)) {
    return
  }

  // cache context
  const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

  // write context
  READ_CONTEXT.book = book
  READ_CONTEXT.board = board
  READ_CONTEXT.element = object

  READ_CONTEXT.elementid = object.id ?? ''
  READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)

  const playerfromelement = READ_CONTEXT.element.player ?? MEMORY.operator
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementisplayer
    ? READ_CONTEXT.elementid
    : playerfromelement

  // read cycle
  const cycle = memoryelementstatread(object, 'cycle')

  // run chip code
  const id = object.id ?? ''
  const itemname = NAME(object.name ?? object.kinddata?.name ?? '')
  os.tick(id, DRIVER_TYPE.RUNTIME, cycle, itemname, code)

  // clear ticker
  if (isnumber(object?.tickertime)) {
    // clear ticker text after X number of ticks
    if (READ_CONTEXT.timestamp - object.tickertime > TICK_FPS * 5) {
      object.tickertime = 0
      object.tickertext = ''
    }
  }

  // clear used input
  if (READ_CONTEXT.elementisplayer) {
    const flags = memoryreadflags(READ_CONTEXT.elementid)
    if (isnumber(flags.inputcurrent)) {
      flags.inputcurrent = 0
    }
  }

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
}

export function memorystartloader(id: string, code: string) {
  MEMORY.loaders.set(id, code)
}

export function memoryresetchipafteredit(object: string) {
  os.halt(object)
}

export function memoryrestartallchipsandflags() {
  // stop all chips
  const ids = os.ids()
  for (let i = 0; i < ids.length; ++i) {
    os.halt(ids[i])
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // drop all flags from mainbook
  mainbook.flags = {}
}

export function memorytick(playeronly = false) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // inc timestamp
  const timestamp = mainbook.timestamp + 1

  // loaders get more processing time
  const resethalt = RUNTIME.HALT_AT_COUNT
  RUNTIME.HALT_AT_COUNT = resethalt * 2

  // update loaders
  MEMORY.loaders.forEach((code, id) => {
    // cache context
    const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

    // write context
    READ_CONTEXT.timestamp = mainbook.timestamp
    READ_CONTEXT.book = mainbook
    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = id
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = memoryreadoperator()

    // set chip
    const maybearg = memoryloaderarg(id)
    if (ispresent(maybearg)) {
      os.arg(id, maybearg)
    }

    // run code
    os.tick(id, DRIVER_TYPE.LOADER, 1, 'loader', code)

    // teardown on ended
    if (os.isended(id)) {
      os.halt(id)
      MEMORY.loaders.delete(id)
    }

    // restore context
    objectKeys(OLD_CONTEXT).forEach((key) => {
      // @ts-expect-error dont bother me
      READ_CONTEXT[key] = OLD_CONTEXT[key]
    })
  })

  // reset
  RUNTIME.HALT_AT_COUNT = resethalt

  // track tick
  mainbook.timestamp = timestamp
  READ_CONTEXT.timestamp = timestamp

  // update boards / build code / run chips
  const boards = bookplayerreadboards(mainbook)
  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]

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

    // iterate code needed to update given board
    const run = boardtick(board, timestamp)
    for (let i = 0; i < run.length; ++i) {
      const { id, type, code, object } = run[i]
      if (type === CODE_PAGE_TYPE.ERROR) {
        // handle dead code
        os.halt(id)
        // in dev, we only run player objects
      } else if (!playeronly || ispid(object?.id ?? '')) {
        // handle active code
        memorytickobject(mainbook, board, object, code)
      }
    }
  }
}

export function memorysendtoboards(
  target: string | PT,
  message: string,
  data: any,
  boards: BOARD[],
) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  function sendtoelements(elements: BOARD_ELEMENT[]) {
    for (let i = 0; i < elements.length; ++i) {
      const element = elements[i]
      if (ispresent(element.id)) {
        const chipmessage = `${senderid(element.id)}:${message}`
        SOFTWARE.emit('', chipmessage, data)
      }
    }
  }

  if (ispt(target)) {
    for (let b = 0; b < boards.length; ++b) {
      const board = boards[b]
      const element = boardelementread(board, target)
      if (ispresent(element)) {
        sendtoelements([element])
      }
    }
    return
  }

  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]

    // the intent here is to gather a list of target chip ids
    const ltarget = NAME(target)
    switch (ltarget) {
      case 'all':
      case 'self':
      case 'others': {
        sendtoelements(Object.values(board.objects))
        break
      }
      default: {
        // check named elements first
        sendtoelements(listelementsbyidnameorpts(board, [target]))
        break
      }
    }
  }
}

export function memorycleanup() {
  os.gc()
}

export function memoryclirepeatlast(player: string) {
  const flags = memoryreadflags(player)
  // setup as array of invokes
  const maybecli = (flags.playbuffer = isstring(flags.playbuffer)
    ? flags.playbuffer
    : '')
  // run it
  if (maybecli) {
    memorycli(player, maybecli, false)
  }
}

export function memorycli(player: string, cli: string, tracking = true) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // player id + unique id fo run
  const id = `${player}_cli`

  // write context
  READ_CONTEXT.timestamp = mainbook.timestamp
  READ_CONTEXT.book = mainbook
  READ_CONTEXT.board = bookplayerreadboard(mainbook, player)
  READ_CONTEXT.element = boardobjectread(READ_CONTEXT.board, player)
  READ_CONTEXT.elementid = READ_CONTEXT.element?.id ?? ''
  READ_CONTEXT.elementisplayer = true
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementid || player

  // cli invokes get more processing time
  const resethalt = RUNTIME.HALT_AT_COUNT
  RUNTIME.HALT_AT_COUNT = resethalt * 8

  // invoke once
  os.once(id, DRIVER_TYPE.CLI, 'cli', cli)

  // track invoke
  if (tracking) {
    const flags = memoryreadflags(player)
    // track value of invoke
    flags.playbuffer = cli
  }

  // reset to normal halt rate
  RUNTIME.HALT_AT_COUNT = resethalt
}

export function memoryrun(address: string) {
  // we assume READ_CONTEXT is setup correctly when this is run
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  const codepage = bookreadcodepagebyaddress(mainbook, address)
  if (
    !ispresent(mainbook) ||
    !ispresent(codepage) ||
    !ispresent(READ_CONTEXT.element)
  ) {
    return
  }

  // cache context
  const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

  const id = `${address}_run`
  const itemname = NAME(
    READ_CONTEXT.element.name ?? READ_CONTEXT.element.kinddata?.name ?? '',
  )
  const itemcode = codepage?.code ?? ''
  // set arg to value on chip with id = id
  os.once(id, DRIVER_TYPE.RUNTIME, itemname, itemcode)

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
}

export function memoryreadgadgetlayers(
  player: string,
  tickercolor: COLOR,
): {
  over: LAYER[]
  under: LAYER[]
  layers: LAYER[]
} {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const playerboard = bookplayerreadboard(mainbook, player)

  const over: LAYER[] = []
  const under: LAYER[] = []
  const layers: LAYER[] = []
  if (!ispresent(mainbook) || !ispresent(playerboard)) {
    return { over, under, layers }
  }

  // read graphics mode
  const graphics = playerboard.graphics ?? 'flat'

  // read over / under
  const overboard = memoryboardread(playerboard.overboard ?? '')
  const underboard = memoryboardread(playerboard.underboard ?? '')

  // compose layers
  under.push(
    ...memoryconverttogadgetlayers(
      player,
      0,
      underboard,
      tickercolor,
      false,
      true,
    ),
  )
  layers.push(
    ...memoryconverttogadgetlayers(
      player,
      under.length,
      playerboard,
      tickercolor,
      true,
      graphics === 'flat' ? false : true,
    ),
  )
  over.push(
    ...memoryconverttogadgetlayers(
      player,
      under.length + layers.length,
      overboard,
      tickercolor,
      false,
      false,
    ),
  )

  return { over, under, layers }
}
