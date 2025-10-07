import { objectKeys } from 'ts-extras'
import { senderid } from 'zss/chip'
import { RUNTIME } from 'zss/config'
import { MESSAGE, api_error, api_log, vm_touched } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { LAYER, LAYER_TYPE } from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid, ispid } from 'zss/mapping/guid'
import { CYCLE_DEFAULT, TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { maptonumber } from 'zss/mapping/value'
import { createos } from 'zss/os'
import {
  dirfrompts,
  ispt,
  mapstrdir,
  mapstrdirtoconst,
  ptapplydir,
} from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, NAME, PT } from 'zss/words/types'

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
  bookensurecodepagewithtype,
  bookhasflags,
  bookreadcodepagebyaddress,
  bookreadcodepagesbytypeandstat,
  bookreadflag,
  bookreadflags,
  bookreadsortedcodepages,
  bookwriteflag,
  createbook,
} from './book'
import {
  bookplayermovetoboard,
  bookplayerreadactive,
  bookplayerreadboards,
  bookplayersetboard,
} from './bookplayer'
import {
  codepagereaddata,
  codepagereadstat,
  codepagereadtype,
} from './codepage'
import { memoryloaderarg, memoryloaderplayer } from './loader'
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
  // running loaders
  loaders: new Map<string, string>(),
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
      if (memoryelementstatread(object, 'collision') !== COLLISION.ISGHOST) {
        // update lookup (only objects)
        boardobjectlookupwrite(board, object)
        boardnamedwrite(board, object)
      }
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

  // if we have a current board, and a player on said board
  let currentboard = memoryreadplayerboard(player)
  if (ispresent(currentboard?.objects[player])) {
    return true
  }

  // fallback to placing on the title board
  if (!ispresent(currentboard)) {
    const titlepage = memorypickcodepagewithtype(
      CODE_PAGE_TYPE.BOARD,
      MEMORY_LABEL.TITLE,
    )
    currentboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(titlepage)
  }

  // unable to find board
  if (!ispresent(currentboard)) {
    return api_error(
      SOFTWARE,
      player,
      'login:title',
      `login failed to find board with '${MEMORY_LABEL.TITLE}' stat`,
    )
  }

  // unable to find kind
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

  // plotting a new player
  const startx = currentboard.startx ?? 0
  const starty = currentboard.starty ?? 0
  const px = isnumber(startx) ? startx : Math.round(BOARD_WIDTH * 0.5)
  const py = isnumber(starty) ? starty : Math.round(BOARD_HEIGHT * 0.5)
  const obj = boardobjectcreatefromkind(
    currentboard,
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

    // setup flags
    const flags = bookreadflags(mainbook, player)
    flags.enterx = px
    flags.entery = py
    if (!ispresent(flags.deaths)) {
      flags.deaths = 0
    }
    if (!ispresent(flags.highscore)) {
      flags.highscore = 0
    }

    // track current board
    bookplayersetboard(mainbook, player, currentboard.id)
    return true
  }

  return false
}

export function memoryplayerlogout(player: string, isendgame: boolean) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const removelist: string[] = []
  for (let i = 0; i < mainbook.activelist.length; ++i) {
    const mayberemove = mainbook.activelist[i]
    if (mayberemove.startsWith(player)) {
      removelist.push(mayberemove)
    }
  }

  const board = memoryreadplayerboard(player)
  for (let i = 0; i < removelist.length; ++i) {
    const remove = removelist[i]

    // get current flags
    const flags = bookreadflags(mainbook, remove)

    // capture carry-over values
    const saveflags: Record<string, any> = {}
    if (isendgame) {
      // we track deaths & highscore
      saveflags.deaths = maptonumber(flags.deaths, 0) + 1
      saveflags.highscore = Math.max(
        maptonumber(flags.score, 0),
        maptonumber(flags.highscore, 0),
      )
    }

    // clear from active list
    bookplayersetboard(mainbook, remove, '')

    // clear element
    boardobjectnamedlookupdelete(board, boardobjectread(board, remove))
    boarddeleteobject(board, remove)

    // halt chip
    os.halt(remove)

    // clear memory
    bookclearflags(mainbook, remove)

    // set carry-over values
    if (isendgame) {
      const newflags = bookreadflags(mainbook, remove)
      Object.assign(newflags, saveflags)
    }
  }
}

export function memoryreadplayerboard(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const address = bookreadflag(mainbook, player, 'board') as string
  const codepage = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, address)
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function memoryreadplayeractive(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const isactive = bookplayerreadactive(mainbook, player)
  const board = memoryreadplayerboard(player)
  const playerelement = boardobjectread(board, player)
  return isactive && ispresent(playerelement)
}

export function memoryplayerscan(players: Record<string, number>) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)

  // ensure we're tracking all ids listed in book
  const activelist = mainbook?.activelist ?? []
  for (let i = 0; i < activelist.length; ++i) {
    const objectid = activelist[i]
    if (!ispresent(players[objectid])) {
      players[objectid] = 0
    }
  }

  // ensure we're tracking any orphaned player elements
  const boards = bookplayerreadboards(mainbook)
  for (let i = 0; i < boards.length; ++i) {
    const board = boards[i]
    const objects = Object.keys(board.objects)
    for (let o = 0; o < objects.length; ++o) {
      const object = board.objects[objects[o]]
      const objectid = object.id
      if (ispid(objectid)) {
        // ensure marked location
        bookplayersetboard(mainbook, objectid, board.id)
        // ensure tracking
        if (!ispresent(players[objectid])) {
          players[objectid] = 0
        }
      }
    }
  }
}

export function memorymessage(message: MESSAGE) {
  os.message(message)
}

export function memorysendinteraction(
  player: string,
  fromelement: BOARD_ELEMENT,
  toelement: BOARD_ELEMENT,
  message: string,
) {
  if (!isstring(toelement.id)) {
    return
  }
  if (isstring(fromelement.id)) {
    vm_touched(SOFTWARE, player, fromelement.id, toelement.id, message)
  } else {
    const idx = `${pttoindex(
      { x: fromelement.x ?? 0, y: fromelement.y ?? 0 },
      BOARD_WIDTH,
    )}`
    vm_touched(SOFTWARE, player, idx, toelement.id, message)
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

function playerwaszapped(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
) {
  const enterx = bookreadflag(book, player, 'enterx')
  const entery = bookreadflag(book, player, 'entery')
  if (isnumber(enterx) && isnumber(entery) && ispresent(element)) {
    boardmoveobject(board, element, { x: enterx, y: entery })
  }
}

export function memorymoveobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  dest: PT,
  didpush: Record<string, boolean> = {},
) {
  if (!ispresent(element?.id)) {
    return false
  }

  let blocked = boardmoveobject(board, element, dest)
  const collision = memoryelementstatread(element, 'collision')

  // check pushable AND bullets can't PUSH
  if (ispresent(blocked) && collision !== COLLISION.ISBULLET) {
    const elementisplayer = ispid(element?.id)

    // is blocked pushable ?
    const isitem = !!memoryelementstatread(blocked, 'item')
    const ispushable = memoryelementcheckpushable(element, blocked)

    // player cannot push items
    const blockedid = blocked.id ?? ''
    if (ispushable && (!elementisplayer || !isitem) && !didpush[blockedid]) {
      didpush[blockedid] = true
      const bumpdir = dirfrompts({ x: element.x ?? 0, y: element.y ?? 0 }, dest)
      const bump = ptapplydir({ x: blocked.x ?? 0, y: blocked.y ?? 0 }, bumpdir)
      memorymoveobject(book, board, blocked, bump)
    }

    // update blocked by element
    blocked = boardmoveobject(board, element, dest)
  }

  if (ispresent(blocked)) {
    const elementisplayer = ispid(element.id)
    const elementpartyisplayer = ispid(element.party ?? element.id)
    const elementisbullet =
      memoryelementstatread(element, 'collision') === COLLISION.ISBULLET
    const elementiskind = element.kind ?? ''

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
    const blockedbykind = blocked.kind ?? ''

    const samemparty = elementpartyisplayer === blockedpartyisplayer

    let blockedplayer = ''
    if (blocked.party && blockedpartyisplayer) {
      blockedplayer = blocked.party
    }
    if (blockedbyplayer) {
      blockedplayer = blocked.id ?? ''
    }

    if (elementisplayer && blockedbykind === 'edge') {
      playerblockedbyedge(book, board, element, dest)
    } else if (elementisplayer) {
      if (blockedbyplayer) {
        // same party touch
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          'bump',
        )
      } else if (blockedisbullet) {
        if (board?.restartonzap) {
          playerwaszapped(book, board, element, elementplayer)
        }
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          samemparty ? 'partyshot' : 'shot',
        )
        memorysendinteraction(elementplayer, element, blocked, 'thud')
      } else {
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          'touch',
        )
      }
    } else if (elementisbullet) {
      if (blockedbyplayer) {
        if (board?.restartonzap) {
          playerwaszapped(book, board, blocked, blockedplayer)
        }
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          samemparty ? 'partyshot' : 'shot',
        )
      } else if (blockedisbullet) {
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          'thud',
        )
      } else {
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        switch (blockedbykind) {
          case 'object':
          case 'scroll':
            // object & scroll kinds can be shot by everything
            memorysendinteraction(
              samemparty ? '' : elementplayer,
              element,
              blocked,
              'shot',
            )
            break
          default:
            // everything else handles shot differently
            memorysendinteraction(
              samemparty ? '' : elementplayer,
              element,
              blocked,
              samemparty ? 'partyshot' : 'shot',
            )
            break
        }
      }
    } else {
      if (blockedbyplayer) {
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          'bump',
        )
      } else if (blockedisbullet) {
        switch (elementiskind) {
          case 'object':
          case 'scroll':
            // object & scroll kinds can be shot by everything
            memorysendinteraction(
              samemparty ? '' : elementplayer,
              element,
              blocked,
              'shot',
            )
            break
          default:
            // everything else handles shot differently
            memorysendinteraction(
              samemparty ? '' : elementplayer,
              element,
              blocked,
              samemparty ? 'partyshot' : 'shot',
            )
            break
        }
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          'thud',
        )
      } else {
        memorysendinteraction(
          samemparty ? '' : blockedplayer,
          blocked,
          element,
          'thud',
        )
        memorysendinteraction(
          samemparty ? '' : elementplayer,
          element,
          blocked,
          'bump',
        )
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

    // loaders use the player that invoked them as a point of reference
    const player = memoryloaderplayer(id) ?? ''

    // write context
    READ_CONTEXT.timestamp = mainbook.timestamp
    READ_CONTEXT.book = mainbook
    READ_CONTEXT.board = memoryreadplayerboard(player)
    READ_CONTEXT.element = boardobjectread(READ_CONTEXT.board, player)
    READ_CONTEXT.elementid = READ_CONTEXT.element?.id ?? ''
    READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)
    READ_CONTEXT.elementfocus = READ_CONTEXT.elementid || player

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
  READ_CONTEXT.board = memoryreadplayerboard(player)
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

export type MEMORY_GADGET_LAYERS = {
  id: string
  board: string
  over: LAYER[]
  under: LAYER[]
  layers: LAYER[]
  tickers: string[]
}

export function memoryreadgadgetlayers(
  board: MAYBE<BOARD>,
): MEMORY_GADGET_LAYERS {
  const over: LAYER[] = []
  const under: LAYER[] = []
  const layers: LAYER[] = []
  const tickers: string[] = []
  if (!ispresent(board)) {
    return { id: '', board: '', over, under, layers, tickers }
  }

  // composite id
  const id4all: string[] = [`${board.id}`]

  // read over / under
  const overboard = memoryoverboardread(board)
  if (overboard?.id) {
    id4all.push(overboard.id)
  }

  const underboard = memoryunderboardread(board)
  if (underboard?.id) {
    id4all.push(underboard.id)
  }

  // compose layers
  under.push(...memoryconverttogadgetlayers(0, underboard, tickers, false))
  layers.push(
    ...memoryconverttogadgetlayers(under.length, board, tickers, true),
  )
  over.push(
    ...memoryconverttogadgetlayers(
      under.length + layers.length,
      overboard,
      tickers,
      false,
    ),
  )

  // scan for media layers
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.type === LAYER_TYPE.MEDIA) {
      id4all.push(layer.id)
    }
  }

  return { id: id4all.join('|'), board: board.id, over, under, layers, tickers }
}
