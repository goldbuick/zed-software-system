import { objectKeys } from 'ts-extras'
import { senderid } from 'zss/chip'
import { RUNTIME } from 'zss/config'
import { api_error, MESSAGE, api_log } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { LAYER } from 'zss/gadget/data/types'
import { pick, pickwith } from 'zss/mapping/array'
import { createsid, ispid } from 'zss/mapping/guid'
import { CYCLE_DEFAULT, TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { ispt } from 'zss/words/dir'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import { listelementsbyattr } from './atomics'
import {
  boarddeleteobject,
  boardelementread,
  boardobjectcreatefromkind,
  boardobjectread,
  boardsetterrain,
} from './board'
import { boardelementname } from './boardelement'
import {
  bookclearflags,
  bookelementstatread,
  bookensurecodepagewithtype,
  bookhasflags,
  bookplayermovetoboard,
  bookplayerreadactive,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadcodepagebyaddress,
  bookreadcodepagesbytypeandstat,
  bookreadflags,
  bookreadobject,
  createbook,
} from './book'
import {
  bookboardmoveobject,
  bookboardobjectnamedlookupdelete,
  bookboardsafedelete,
  bookboardtick,
} from './bookboard'
import { codepagereaddata, codepagereadstat } from './codepage'
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
      player,
      'login:title',
      `login failed to find board with '${MEMORY_LABEL.TITLE}' stat`,
    )
  }

  const playerkind = bookreadobject(mainbook, MEMORY_LABEL.PLAYER)
  if (!ispresent(playerkind)) {
    return api_error(
      SOFTWARE,
      player,
      'login:player',
      `login failed to find object type '${MEMORY_LABEL.PLAYER}'`,
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
    bookboardobjectnamedlookupdelete(
      mainbook,
      board,
      boardobjectread(board, remove),
    )
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
  const fromname = boardelementname(fromelement)
  if (isstring(toelement.id)) {
    SOFTWARE.emit(player, `vm:touched`, [toelement.id, fromname, message])
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
    const boards = bookreadcodepagesbytypeandstat(
      book,
      CODE_PAGE_TYPE.BOARD,
      board?.exitwest ?? '',
    )
    if (boards.length) {
      const board = pick(boards)
      bookplayermovetoboard(book, elementid, board.id, {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      })
    }
  } else if (dest.x >= BOARD_WIDTH) {
    // exit east
    const boards = bookreadcodepagesbytypeandstat(
      book,
      CODE_PAGE_TYPE.BOARD,
      board?.exiteast ?? '',
    )
    if (boards.length) {
      const board = pick(boards)
      bookplayermovetoboard(book, elementid, board.id, {
        x: 0,
        y: dest.y,
      })
    }
  } else if (dest.y < 0) {
    // exit north
    const boards = bookreadcodepagesbytypeandstat(
      book,
      CODE_PAGE_TYPE.BOARD,
      board?.exitnorth ?? '',
    )
    if (boards.length) {
      const board = pick(boards)
      bookplayermovetoboard(book, elementid, board.id, {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      })
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    // exit south
    const boards = bookreadcodepagesbytypeandstat(
      book,
      CODE_PAGE_TYPE.BOARD,
      board?.exitsouth ?? '',
    )
    if (boards.length) {
      const board = pick(boards)
      bookplayermovetoboard(book, elementid, board.id, {
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

  const blocked = bookboardmoveobject(book, board, element, dest)
  if (ispresent(blocked)) {
    const elementisplayer = ispid(element.id)
    const elementpartyisplayer = ispid(element.party ?? element.id)
    const elementisbullet =
      bookelementstatread(book, element, 'collision') === COLLISION.ISBULLET

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
      bookelementstatread(book, blocked, 'collision') === COLLISION.ISBULLET

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
        sendinteraction('', blocked, element, 'bump')
        sendinteraction('', element, blocked, 'bump')
      } else if (blockedisbullet) {
        if (elementpartyisplayer === blockedpartyisplayer) {
          sendinteraction('', blocked, element, 'thud')
          sendinteraction('', element, blocked, 'partyshot')
        } else {
          sendinteraction(blockedplayer, blocked, element, 'thud')
          sendinteraction(elementplayer, element, blocked, 'shot')
        }
      } else {
        sendinteraction(blockedplayer, blocked, element, 'thud')
        sendinteraction(elementplayer, element, blocked, 'touch')
      }
    } else if (elementisbullet) {
      if (blockedisbullet) {
        sendinteraction('', blocked, element, 'thud')
        sendinteraction('', element, blocked, 'thud')
      } else {
        if (elementpartyisplayer === blockedpartyisplayer) {
          sendinteraction('', blocked, element, 'thud')
          sendinteraction('', element, blocked, 'partyshot')
        } else {
          sendinteraction(blockedplayer, blocked, element, 'thud')
          sendinteraction(elementplayer, element, blocked, 'shot')
        }
      }
    } else {
      if (blockedbyplayer) {
        sendinteraction(blockedplayer, blocked, element, 'bump')
        sendinteraction(elementplayer, element, blocked, 'touch')
      } else if (blockedisbullet) {
        if (elementpartyisplayer === blockedpartyisplayer) {
          sendinteraction('', blocked, element, 'partyshot')
          sendinteraction('', element, blocked, 'thud')
        } else {
          sendinteraction(blockedplayer, blocked, element, 'shot')
          sendinteraction(elementplayer, element, blocked, 'thud')
        }
      } else {
        sendinteraction('', blocked, element, 'thud')
        sendinteraction('', element, blocked, 'bump')
      }
    }

    // delete item and breakable elements
    if (
      (elementisplayer && bookelementstatread(book, blocked, 'item')) ||
      (elementisbullet && bookelementstatread(book, blocked, 'breakable'))
    ) {
      if (ispresent(blocked?.id)) {
        const maybeobject = boardelementread(board, {
          x: blocked.x ?? -1,
          y: blocked.y ?? -1,
        })
        if (ispresent(maybeobject)) {
          // mark target for deletion
          bookboardsafedelete(
            READ_CONTEXT.book,
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
  const cycle = bookelementstatread(book, object, 'cycle')

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
    const run = bookboardtick(mainbook, board, timestamp)
    // iterate code needed to update given board
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
        sendtoelements(listelementsbyattr(board, [target]))
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
  const overboard = bookreadboard(mainbook, playerboard.overboard ?? '')
  const underboard = bookreadboard(mainbook, playerboard.underboard ?? '')

  // compose layers
  under.push(
    ...memoryconverttogadgetlayers(
      player,
      0,
      mainbook,
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
      mainbook,
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
      mainbook,
      overboard,
      tickercolor,
      false,
      false,
    ),
  )

  return { over, under, layers }
}
