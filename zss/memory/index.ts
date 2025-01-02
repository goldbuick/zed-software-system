import { objectKeys } from 'ts-extras'
import { createchipid, MESSAGE } from 'zss/chip'
import { RUNTIME } from 'zss/config'
import { api_error, tape_debug, tape_info, vm_flush } from 'zss/device/api'
import {
  mimetypeofbytesread,
  parsebinaryfile,
  parsetextfile,
  parsezipfile,
} from 'zss/firmware/loader/parsefile'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { LAYER } from 'zss/gadget/data/types'
import { createpid, ispid } from 'zss/mapping/guid'
import { CYCLE_DEFAULT, TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLOR, NAME } from 'zss/words/types'

import {
  boarddeleteobject,
  boardelementname,
  boardobjectcreatefromkind,
  boardobjectread,
} from './board'
import {
  bookboardobjectnamedlookupdelete,
  bookboardtick,
  bookclearflags,
  bookelementkindread,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadcodepagebyaddress,
  bookreadcodepagesbytype,
  bookreadflags,
  bookreadobject,
  bookwritecodepage,
  createbook,
} from './book'
import {
  codepagereadstats,
  codepagetypetostring,
  createcodepage,
} from './codepage'
import { memoryconverttogadgetlayers } from './rendertogadget'
import {
  BINARY_READER,
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
  // default player for aggro
  defaultplayer: createpid(),
  // active software
  software: {
    main: '',
    content: '',
  },
  books: new Map<string, BOOK>(),
  // running code
  chips: new Map<string, string>(),
  loaders: new Map<string, string>(),
  // book indexes for running code
  chipindex: new Map<string, string>(),
  codepageindex: new Map<string, string>(),
  // external content loaders
  binaryfiles: new Map<string, BINARY_READER>(),
}

export function memorysetdefaultplayer(player: string) {
  console.info('memorysetdefaultplayer', player)
  MEMORY.defaultplayer = player
}

export function memorygetdefaultplayer() {
  return MEMORY.defaultplayer
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
  tape_info('memory', `created [book] ${book.name}`)
  return book
}

export function memoryensurebookbyname(name: string) {
  let book = memoryreadbookbyaddress(name)
  if (!ispresent(book)) {
    book = createbook([])
    book.name = name
  }
  memorysetbook(book)
  tape_info('memory', `created [book] ${book.name}`)
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
      tape_info('memory', `opened [book] ${book.name} for ${slot}`)
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
  const book = memoryensuresoftwarebook(slot)

  // lookup by address
  let codepage = bookreadcodepagebyaddress(book, address)
  if (ispresent(codepage)) {
    return codepage
  }

  // create new codepage
  const typestr = codepagetypetostring(createtype)
  codepage = createcodepage(
    typestr === 'object' ? `@${address}\n` : `@${typestr} ${address}\n`,
    {},
  )
  bookwritecodepage(book, codepage)
  memorysetcodepageindex(codepage.id, book.id)
  vm_flush('memory', '', MEMORY.defaultplayer)

  // result codepage
  return codepage
}

export function memoryreadflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return bookreadflags(mainbook, id)
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

export function memorysetcodepageindex(codepage: string, book: string) {
  MEMORY.codepageindex.set(codepage, book)
}

export function memoryreadbookbycodepage(codepage: MAYBE<string>): MAYBE<BOOK> {
  return memoryreadbookbyaddress(MEMORY.codepageindex.get(codepage ?? '') ?? '')
}

export function memorysetchipindex(chip: string, book: string) {
  MEMORY.chipindex.set(chip, book)
}

export function memoryreadbookbychip(chip: MAYBE<string>): MAYBE<BOOK> {
  return memoryreadbookbyaddress(MEMORY.chipindex.get(chip ?? '') ?? '')
}

export function memoryplayerlogin(player: string): boolean {
  if (!isstring(player) || !player) {
    return api_error(
      'memory',
      'login',
      `failed for playerid ==>${player}<==`,
      player,
    )
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return api_error(
      'memory',
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

  // place on title board
  const titleboard = bookreadboard(mainbook, MEMORY_LABEL.TITLE)
  if (!ispresent(titleboard)) {
    return api_error(
      'memory',
      'login:title',
      `login failed to find board '${MEMORY_LABEL.TITLE}'`,
      player,
    )
  }

  const playerkind = bookreadobject(mainbook, MEMORY_LABEL.PLAYER)
  if (!ispresent(playerkind)) {
    return api_error(
      'memory',
      'login:player',
      `login failed to find object type '${MEMORY_LABEL.PLAYER}'`,
      player,
    )
  }

  // TODO: what is a sensible way to place here ?
  // via player token I think ..
  const kindname = playerkind.name ?? MEMORY_LABEL.PLAYER
  const obj = boardobjectcreatefromkind(
    titleboard,
    { x: 0, y: 0 },
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

  // clear memory
  bookclearflags(mainbook, player)
  bookclearflags(mainbook, createchipid(player))
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
  const objectid = object.id ?? ''
  READ_CONTEXT.book = book
  READ_CONTEXT.board = board
  READ_CONTEXT.element = object
  READ_CONTEXT.isplayer = ispid(objectid)
  READ_CONTEXT.player = object.player ?? MEMORY.defaultplayer

  // read cycle
  const kinddata = bookelementkindread(book, object)
  const cycle = object.cycle ?? kinddata?.cycle ?? cycledefault

  // run chip code
  const id = object.id ?? ''
  const itemname = boardelementname(object)
  os.tick(
    id,
    DRIVER_TYPE.CODE_PAGE,
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
  if (READ_CONTEXT.isplayer) {
    const flags = memoryreadflags(READ_CONTEXT.element.id ?? '')
    flags.inputcurrent = 0
  }

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
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
    os.tick(id, DRIVER_TYPE.LOADER, 1, 'loader', code)
    // teardown
    if (os.isended(id)) {
      os.halt(id)
      MEMORY.loaders.delete(id)
    }
  })

  // reset
  RUNTIME.HALT_AT_COUNT = resethalt

  // track tick
  mainbook.timestamp = timestamp
  READ_CONTEXT.timestamp = timestamp

  // update boards / build code / run chips
  const boards = bookplayerreadboards(mainbook)
  boards.forEach((board) => {
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
  })
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
  READ_CONTEXT.player = player
  READ_CONTEXT.isplayer = true

  // invoke once
  tape_debug('memory', 'running', mainbook.timestamp, id, cli)
  os.once(id, DRIVER_TYPE.CLI, 'cli', cli)
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
  const itemname = boardelementname(READ_CONTEXT.element)
  const itemcode = codepage?.code ?? ''
  // set arg to value on chip with id = id
  os.once(id, DRIVER_TYPE.CODE_PAGE, itemname, itemcode)
}

function memoryloader(
  player: string,
  file: File,
  fileext: string,
  binaryfile: Uint8Array,
) {
  // we scan main book for loaders
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const shouldmatch = ['binaryfile', fileext]
  tape_info('memory', 'looking for stats', ...shouldmatch)

  const loaders = bookreadcodepagesbytype(
    mainbook,
    CODE_PAGE_TYPE.LOADER,
  ).filter((codepage) => {
    const stats = codepagereadstats(codepage)
    const matched = Object.keys(stats).filter((name) =>
      shouldmatch.includes(NAME(name)),
    )
    return matched.length === shouldmatch.length
  })

  for (let i = 0; i < loaders.length; ++i) {
    const loader = loaders[i]

    // player id + unique id fo run
    const id = `${player}_load_${loader.id}`

    // create binary file loader
    MEMORY.binaryfiles.set(id, {
      filename: file.name,
      cursor: 0,
      bytes: binaryfile,
      dataview: new DataView(binaryfile.buffer),
    })

    // add code to active loaders
    tape_info('memory', 'starting loader', mainbook.timestamp, id)
    MEMORY.loaders.set(id, loader.code)
  }
}

export function memoryreadbinaryfile(id: string) {
  return MEMORY.binaryfiles.get(id)
}

export function memoryloadfile(player: string, file: File | undefined) {
  function handlefiletype(type: string) {
    if (!ispresent(file)) {
      return
    }
    switch (type) {
      case 'text/plain':
        parsetextfile(file).catch((err) =>
          api_error('memory', 'crash', err.message),
        )
        break
      case 'application/zip':
        parsezipfile(file, (zipfile) => memoryloadfile(player, zipfile)).catch(
          (err) => api_error('memory', 'crash', err.message),
        )
        break
      case 'application/octet-stream':
        parsebinaryfile(file, (fileext, binaryfile) => {
          memoryloader(player, file, fileext, binaryfile)
        }).catch((err) => api_error('memory', 'crash', err.message))
        break
      default:
        file
          .arrayBuffer()
          .then((arraybuffer) => {
            const type = mimetypeofbytesread(
              file.name,
              new Uint8Array(arraybuffer),
            )
            if (type) {
              handlefiletype(type)
            } else {
              return api_error(
                'memory',
                'loadfile',
                `unsupported file ${file.name}`,
              )
            }
          })
          .catch((err) => api_error('memory', 'crash', err.message))
        return
    }
  }
  handlefiletype(file?.type ?? '')
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
