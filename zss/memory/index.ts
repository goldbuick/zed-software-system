import { objectKeys } from 'ts-extras'
import { CHIP, senderid } from 'zss/chip'
import { RUNTIME } from 'zss/config'
import { api_error, MESSAGE, tape_debug, tape_info } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { LAYER } from 'zss/gadget/data/types'
import { pickwith } from 'zss/mapping/array'
import { createsid, ispid } from 'zss/mapping/guid'
import { CYCLE_DEFAULT, TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, NAME, PT } from 'zss/words/types'

import {
  boarddeleteobject,
  boardelementread,
  boardobjectcreatefromkind,
  boardobjectread,
  boardsetterrain,
} from './board'
import {
  bookboardmoveobject,
  bookboardobjectnamedlookupdelete,
  bookboardsafedelete,
  bookboardtick,
  bookclearflags,
  bookelementkindread,
  bookensurecodepagewithtype,
  bookplayerreadactive,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadcodepagebyaddress,
  bookreadcodepagesbytypeandstat,
  bookreadcodepagewithtype,
  bookreadflags,
  bookreadobject,
  createbook,
} from './book'
import {
  codepagereaddata,
  codepagereadstat,
  codepagereadstatdefaults,
  codepagereadstats,
} from './codepage'
import { memoryloaderarg } from './loader'
import { memoryconverttogadgetlayers } from './rendertogadget'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from './types'

// manages chips
const os = createos()

export enum MEMORY_LABEL {
  MAIN = 'main',
  TITLE = 'title',
  PLAYER = 'player',
  CONTENT = 'content',
  GADGETSTORE = 'gadgetstore',
  GADGETSYNC = 'gadgetsync',
}

const MEMORY = {
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
  tape_info(SOFTWARE, `created [book] ${book.name}`)
  return book
}

export function memoryensurebookbyname(name: string) {
  let book = memoryreadbookbyaddress(name)
  if (!ispresent(book)) {
    book = createbook([])
    book.name = name
  }
  memorysetbook(book)
  tape_info(SOFTWARE, `created [book] ${book.name}`)
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
      tape_info(SOFTWARE, `opened [book] ${book.name} for ${slot}`)
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
  const codepage = bookensurecodepagewithtype(
    memoryensuresoftwarebook(slot),
    createtype,
    address,
  )

  // result codepage
  return codepage
}

export function memoryreadflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookreadflags(mainbook, id)
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
    memorysetsoftwarebook(MEMORY_LABEL.MAIN, book.id)
  }

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
      'login',
      `failed for playerid ==>${player}<==`,
      player,
    )
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return api_error(
      SOFTWARE,
      'login:main',
      `login failed to find book 'main'`,
      player,
    )
  }

  // try to find existing element
  const currentboard = bookplayerreadboard(mainbook, player)
  if (ispresent(currentboard)) {
    // should signal to reset gadget json ??
    return true
  }

  // place on a title board
  const titleboards = bookreadcodepagesbytypeandstat(
    mainbook,
    CODE_PAGE_TYPE.BOARD,
    'title',
  )
  if (titleboards.length === 0) {
    return api_error(
      SOFTWARE,
      'login:title',
      `login failed to find board with '${MEMORY_LABEL.TITLE}' stat`,
      player,
    )
  }

  const playerkind = bookreadobject(mainbook, MEMORY_LABEL.PLAYER)
  if (!ispresent(playerkind)) {
    return api_error(
      SOFTWARE,
      'login:player',
      `login failed to find object type '${MEMORY_LABEL.PLAYER}'`,
      player,
    )
  }

  // TODO: what is a sensible way to place here ?
  // via player token I think ..

  const title = pickwith(player, titleboards)
  const titleboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(title)

  if (ispresent(titleboard)) {
    const startx = codepagereadstat(title, 'startx')
    const starty = codepagereadstat(title, 'starty')
    const px = isnumber(startx) ? startx : Math.round(BOARD_WIDTH * 0.5)
    const py = isnumber(starty) ? starty : Math.round(BOARD_HEIGHT * 0.5)
    const kindname = playerkind.name ?? MEMORY_LABEL.PLAYER
    const obj = boardobjectcreatefromkind(
      titleboard,
      {
        x: px,
        y: py,
      },
      kindname,
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

  // clear from active list
  bookplayersetboard(mainbook, player, '')

  // clear element
  bookboardobjectnamedlookupdelete(
    mainbook,
    board,
    boardobjectread(board, player),
  )
  boarddeleteobject(board, player)

  // halt chip
  os.halt(player)

  // clear memory
  bookclearflags(mainbook, player)
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
  chip: CHIP,
  maybefrom: BOARD_ELEMENT | string,
  maybeto: BOARD_ELEMENT | string,
  message: string,
) {
  const fromid = isstring(maybefrom) ? maybefrom : maybefrom.id
  const frompt: PT | undefined = isstring(maybefrom)
    ? undefined
    : { x: maybefrom.x ?? 0, y: maybefrom.y ?? 0 }
  const toid = isstring(maybeto) ? maybeto : maybeto.id

  // object elements will have ids
  const from = fromid ?? frompt

  if (ispresent(toid) && ispresent(from)) {
    chip.send(toid, message, from)
  }
}

export function memorymoveobject(
  chip: CHIP,
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  dest: PT,
) {
  if (!ispresent(target)) {
    return false
  }
  const blocked = bookboardmoveobject(book, board, target, dest)
  if (ispresent(blocked)) {
    sendinteraction(chip, blocked, chip.id(), 'thud')
    if (target.kind === MEMORY_LABEL.PLAYER) {
      sendinteraction(chip, chip.id(), blocked, 'touch')
    } else if (target.collision === COLLISION.ISBULLET) {
      sendinteraction(chip, chip.id(), blocked, 'shot')
    } else {
      sendinteraction(chip, chip.id(), blocked, 'bump')
    }

    // delete destructible elements
    const blockedkind = bookelementkindread(book, blocked)
    if (blocked.destructible ?? blockedkind?.destructible) {
      if (ispresent(blocked?.id)) {
        // mark target for deletion
        bookboardsafedelete(
          READ_CONTEXT.book,
          READ_CONTEXT.board,
          blocked,
          READ_CONTEXT.timestamp,
        )
      } else {
        // overwrite terrain with empty
        boardsetterrain(board, { x: dest.x, y: dest.y })
      }
      //
      return true
    }
    //
    return false
  }
  //
  return true
}

export function memorytickobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
  code: string,
  cycledefault = CYCLE_DEFAULT,
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
  const kinddata = bookelementkindread(book, object)
  const cycle = object.cycle ?? kinddata?.cycle ?? cycledefault

  // run chip code
  const id = object.id ?? ''
  const itemname = NAME(object.name ?? object.kinddata?.name ?? '')
  os.tick(
    id,
    DRIVER_TYPE.RUNTIME,
    isnumber(cycle) ? cycle : cycledefault,
    itemname,
    code,
  )

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

export function memorytick() {
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
    READ_CONTEXT.elementpt = { x: 0, y: 0 }
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = MEMORY.operator

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
    const run = bookboardtick(mainbook, board, timestamp)
    // iterate code needed to update given board
    for (let i = 0; i < run.length; ++i) {
      const { id, type, code, object } = run[i]
      if (type === CODE_PAGE_TYPE.ERROR) {
        // handle dead code
        os.halt(id)
      } else {
        // handle active code
        memorytickobject(mainbook, board, object, code)
      }
    }
  }
}

export function memorysynthsend(message: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  // send to all objects on active boards -
  // I guess this is an easy way for cross board coordination
  const boards = bookplayerreadboards(mainbook)
  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]
    const ids = Object.keys(board.objects)
    for (let i = 0; i < ids.length; ++i) {
      const element = board.objects[ids[i]]
      const chipmessage = `${senderid(element.id)}:${message}`
      SOFTWARE.emit(chipmessage)
    }
  }
}

export function memorycleanup() {
  os.gc()
}

export function memorycli(player: string, cli = '') {
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
  READ_CONTEXT.elementpt = {
    x: READ_CONTEXT.element?.x ?? 0,
    y: READ_CONTEXT.element?.y ?? 0,
  }
  READ_CONTEXT.elementid = READ_CONTEXT.element?.id ?? ''
  READ_CONTEXT.elementisplayer = true
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementid || player

  // cli invokes get more processing time
  const resethalt = RUNTIME.HALT_AT_COUNT
  RUNTIME.HALT_AT_COUNT = resethalt * 8

  // invoke once
  tape_debug(SOFTWARE, 'running', mainbook.timestamp, id, cli)
  os.once(id, DRIVER_TYPE.CLI, 'cli', cli)

  RUNTIME.HALT_AT_COUNT = resethalt
}

export function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  if (p1.x === p2.x && p1.y === p2.y) {
    const element = boardelementread(board, p1)
    if (ispresent(element)) {
      // figure out stats from kind codepage
      const terrainpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.TERRAIN,
        element.kind ?? '',
      )
      if (ispresent(terrainpage)) {
        const stats = codepagereadstatdefaults(terrainpage)
        console.info(stats)
      }
      const objectpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.OBJECT,
        element.kind ?? '',
      )
      if (ispresent(objectpage)) {
        const stats = codepagereadstatdefaults(objectpage)
        console.info(stats)
      }
    }
    // console.info(p1)
    // gadgettext(player, 'hello?????')
    // gadgettext(player, 'hello?????')
    // gadgettext(player, 'hello?????')
    // gadgethyperlink(player, )
    // gadgethyperlink(player, os.has(player), 'hello', '')
    // we need to send hyperlinks to player
  } else {
    // multi
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
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

  const id = `${address}_run`
  const itemname = NAME(
    READ_CONTEXT.element.name ?? READ_CONTEXT.element.kinddata?.name ?? '',
  )
  const itemcode = codepage?.code ?? ''
  // set arg to value on chip with id = id
  os.once(id, DRIVER_TYPE.RUNTIME, itemname, itemcode)
}

export function memoryreadgadgetlayers(player: string): LAYER[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const playerboard = bookplayerreadboard(mainbook, player)

  const layers: LAYER[] = []
  if (!ispresent(mainbook) || !ispresent(playerboard)) {
    return layers
  }

  // read over board
  const over = bookreadboard(mainbook, playerboard.over ?? '')

  // read under board
  const under = bookreadboard(mainbook, playerboard.under ?? '')

  // compose layers
  const boards = [over, playerboard, under].filter(ispresent)

  let i = 0
  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]
    const view = memoryconverttogadgetlayers(
      player,
      i,
      mainbook,
      board,
      board === playerboard,
    )
    i += view.length
    layers.push(...view)
  }

  return layers
}
