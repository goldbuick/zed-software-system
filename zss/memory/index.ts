import { CONFIG } from 'zss/chip'
import { api_error, tape_debug, tape_info } from 'zss/device/api'
import { DRIVER_TYPE } from 'zss/firmware/boot'
import {
  mimetypeofbytesread,
  parsebinaryfile,
  parsetextfile,
  parsezipfile,
} from 'zss/firmware/parsefile'
import { READ_CONTEXT } from 'zss/firmware/wordtypes'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/gadget/data/textformat'
import {
  COLOR,
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
  LAYER,
} from 'zss/gadget/data/types'
import { average } from 'zss/mapping/array'
import { createpid, ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { CYCLE_DEFAULT, TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  boarddeleteobject,
  boardelementname,
  boardobjectcreatefromkind,
  boardobjectread,
} from './board'
import { boardelementreadstat } from './boardelement'
import {
  bookboardtick,
  bookelementdisplayread,
  bookelementkindread,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadcodepagesbytype,
  bookreadflags,
  bookreadobject,
  createbook,
} from './book'
import { codepagereadstats } from './codepage'
import {
  BINARY_READER,
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
  WORD,
} from './types'

export enum MEMORY_LABEL {
  MAIN = 'main',
  TITLE = 'title',
  PLAYER = 'player',
  CONTENT = 'content',
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
  const laddress = address.toLowerCase()
  return (
    MEMORY.books.get(address) ??
    memoryreadbooklist().find((item) => item.name.toLowerCase() === laddress)
  )
}

export function memorysetsoftwarebook(
  slot: keyof typeof MEMORY.software,
  book: string,
) {
  MEMORY.software[slot] = book
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
      memorysetsoftwarebook('main', book.id)
      tape_info('memory', `opened [book] ${book.name}`)
    }
  }

  // make sure slot is set
  memorysetsoftwarebook(slot, book.id)
  return book
}

export function memoryreadsoftwareflags(
  slot: keyof typeof MEMORY.software,
  id: string,
) {
  const book = memoryensuresoftwarebook(slot)
  return bookreadflags(book, id)
}

export function memoryresetbooks(books: BOOK[]) {
  // clear all books
  MEMORY.books.clear()
  books.forEach((book) => {
    MEMORY.books.set(book.id, book)
    // attempt default for main
    if (book.name.toLowerCase() === 'main') {
      MEMORY.software.main = book.id
    }
  })
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

  const mainbook = memoryreadbookbysoftware('main')
  if (!ispresent(mainbook)) {
    return api_error(
      'memory',
      'login:main',
      `login failed to find book 'main'`,
      player,
    )
  }

  const titleboard = bookreadboard(mainbook, 'title')
  if (!ispresent(titleboard)) {
    return api_error(
      'memory',
      'login:title',
      `login failed to find board 'title'`,
      player,
    )
  }

  const playerkind = bookreadobject(mainbook, 'player')
  if (!ispresent(playerkind)) {
    return api_error(
      'memory',
      'login:player',
      `login failed to find object type 'player'`,
      player,
    )
  }

  // TODO: what is a sensible way to place here ?
  // via player token I think ..
  const pt = { x: 0, y: 0 }
  const kindname = playerkind.name ?? MEMORY_LABEL.PLAYER
  const obj = boardobjectcreatefromkind(titleboard, pt, kindname, player)
  if (ispresent(obj?.id)) {
    bookplayersetboard(mainbook, player, titleboard.codepage)
    return true
  }

  return false
}

export function memoryplayerlogout(player: string) {
  const mainbook = memoryreadbookbysoftware('main')
  MEMORY.books.forEach((book) => {
    const board = bookplayerreadboard(book, player)
    boarddeleteobject(board, player)
    bookplayersetboard(mainbook, player, '')
  })
}

export function memoryplayerscan(players: Record<string, number>) {
  const mainbook = memoryreadbookbysoftware('main')
  const boards = bookplayerreadboards(mainbook)
  for (let i = 0; i < boards.length; ++i) {
    const board = boards[i]
    const objects = Object.keys(board.objects)
    for (let o = 0; o < objects.length; ++o) {
      const object = board.objects[objects[o]]
      const objectid = object.id
      if (ispid(objectid) && ispresent(players[objectid]) === false) {
        players[objectid] = 0
        bookplayersetboard(mainbook, objectid, board.codepage)
      }
    }
  }
}

export function memoryreadcontext(id: string, words: WORD[]) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const flags = bookreadflags(mainbook, id)

  if (isstring(flags.board)) {
    READ_CONTEXT.board = bookreadboard(mainbook, flags.board)
  }
  if (ispresent(READ_CONTEXT.board)) {
    READ_CONTEXT.object = boardobjectread(READ_CONTEXT.board, id)
  }
  if (isstring(flags.player)) {
    READ_CONTEXT.player = flags.player
  }
  READ_CONTEXT.words = words

  return READ_CONTEXT
}

export function memorytick(os: OS, timestamp: number) {
  // update loaders
  const resethalt = CONFIG.HALT_AT_COUNT
  CONFIG.HALT_AT_COUNT = resethalt * 32
  MEMORY.loaders.forEach((code, id) => {
    os.tick(id, DRIVER_TYPE.LOADER, 1, timestamp, 'loader', code)
    // teardown
    if (os.isended(id)) {
      os.halt(id)
      MEMORY.loaders.delete(id)
    }
  })
  CONFIG.HALT_AT_COUNT = resethalt

  // read main book
  const mainbook = memoryreadbookbysoftware('main')
  const boards = bookplayerreadboards(mainbook)
  if (!ispresent(mainbook)) {
    return
  }

  // update boards / build code / run chips
  mainbook.timestamp = timestamp
  boards.forEach((board) => {
    const run = bookboardtick(mainbook, board, timestamp)

    // iterate code needed to update given board
    for (let i = 0; i < run.length; ++i) {
      const item = run[i]

      // write context
      if (ispresent(item.object)) {
        const flags = bookreadflags(mainbook, item.object.id ?? '')

        // clear ticker text after X number of ticks
        if (isnumber(flags.tickertime)) {
          if (timestamp - flags.tickertime > TICK_FPS * 5) {
            flags.tickertime = 0
            flags.tickertext = ''
          }
        }

        // update state
        flags.board = board.codepage
        flags.inputcurrent = 0
      }

      // read cycle
      const cycle = boardelementreadstat(
        item.object,
        'cycle',
        boardelementreadstat(
          bookelementkindread(mainbook, item.object),
          'cycle',
          CYCLE_DEFAULT,
        ),
      )

      // run chip code
      const itemname = boardelementname(item.object)
      os.tick(
        item.id,
        DRIVER_TYPE.CODE_PAGE,
        isnumber(cycle) ? cycle : CYCLE_DEFAULT,
        timestamp,
        itemname,
        item.code,
      )
    }
  })
}

export function memorycli(os: OS, player: string, cli = '') {
  const mainbook = memoryensuresoftwarebook('main')
  if (!ispresent(mainbook)) {
    return
  }

  // player id + unique id fo run
  const id = `${player}_cli`

  // write context
  const flags = bookreadflags(mainbook, id)
  flags.player = player
  flags.inputcurrent = 0

  // invoke once
  tape_debug('memory', 'running', mainbook.timestamp, id, cli)
  os.once(id, DRIVER_TYPE.CLI, mainbook.timestamp, 'cli', cli)
}

function memoryloader(
  player: string,
  file: File,
  fileext: string,
  binaryfile: Uint8Array,
) {
  // we scan main book for loaders
  const mainbook = memoryreadbookbysoftware('main')
  if (!ispresent(mainbook)) {
    return
  }

  const shouldmatch = ['binaryfile', fileext]
  tape_info('memory', 'looking for stats', ...shouldmatch)

  const loaders = bookreadcodepagesbytype(
    mainbook,
    CODE_PAGE_TYPE.LOADER,
  ).filter((codepage) => {
    // all blank stats must match
    const stats = codepagereadstats(codepage)
    const names = Object.keys(stats)
    const matched = names.filter(
      (name) => stats[name] === '' && shouldmatch.includes(name.toLowerCase()),
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

let decoticker = 0
function readdecotickercolor(): COLOR {
  switch (decoticker++) {
    case 0:
      return COLOR.BLUE
    case 1:
      return COLOR.GREEN
    case 2:
      return COLOR.CYAN
    case 3:
      return COLOR.RED
    case 4:
      return COLOR.PURPLE
    case 5:
      return COLOR.YELLOW
    default:
      decoticker = 0
      return COLOR.WHITE
  }
}

function memoryconverttogadgetlayers(
  player: string,
  index: number,
  book: BOOK,
  board: BOARD,
  isprimary: boolean,
  borrowbuffer: number[],
): LAYER[] {
  const layers: LAYER[] = []

  let i = index
  const isbaseboard = i === 0
  const boardwidth = BOARD_WIDTH
  const boardheight = BOARD_HEIGHT
  const defaultcolor = isbaseboard ? COLOR.BLACK : COLOR.CLEAR

  const tiles = createtiles(player, i++, boardwidth, boardheight, defaultcolor)
  layers.push(tiles)

  const shadow = createdither(player, i++, boardwidth, boardheight)
  layers.push(shadow)

  const objectindex = i++
  const objects = createsprites(player, objectindex)
  layers.push(objects)

  const tickers = createtiles(player, i++, boardwidth, boardheight, COLOR.CLEAR)
  layers.push(tickers)

  const tickercontext = {
    ...createwritetextcontext(
      BOARD_WIDTH,
      BOARD_HEIGHT,
      readdecotickercolor(),
      COLOR.CLEAR,
    ),
    ...tickers,
  }

  const control = createlayercontrol(player, i++)
  // hack to keep only one control layer
  if (isprimary) {
    layers.push(control)
  }

  board.terrain.forEach((tile, i) => {
    if (tile) {
      const kind = bookelementkindread(book, tile)
      tiles.char[i] = tile.char ?? kind?.char ?? 0
      tiles.color[i] = tile.color ?? kind?.color ?? defaultcolor
      tiles.bg[i] = tile.bg ?? kind?.bg ?? defaultcolor
      // write to borrow buffer
      if (tiles.color[i] !== (COLOR.CLEAR as number)) {
        borrowbuffer[i] = tiles.color[i]
      }
    }
  })

  const boardobjects = board.objects ?? {}
  Object.values(boardobjects).forEach((object) => {
    // skip if marked for removal or headless
    if (ispresent(object.removed) || ispresent(object.headless)) {
      return
    }

    // should we have bg transparent or match the bg color of the terrain ?
    const id = object.id ?? ''
    const display = bookelementdisplayread(book, object)
    const sprite = createsprite(player, objectindex, id)
    const lx = object.lx ?? object.x ?? 0
    const ly = object.ly ?? object.y ?? 0
    const li = lx + ly * BOARD_WIDTH

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = object.char ?? display?.char ?? 1
    sprite.color = object.color ?? display?.color ?? COLOR.WHITE
    sprite.bg = object.bg ?? display?.bg ?? COLOR.BORROW
    objects.sprites.push(sprite)

    // plot shadow
    if (sprite.bg === COLOR.SHADOW) {
      sprite.bg = COLOR.CLEAR
      shadow.alphas[lx + ly * boardwidth] = 0.5
    }

    // borrow color
    if (sprite.bg === COLOR.BORROW) {
      sprite.bg = borrowbuffer[li] ?? COLOR.BLACK
    }

    // write to borrow buffer
    if (sprite.color !== (COLOR.CLEAR as number)) {
      borrowbuffer[li] = sprite.color
    }

    // write ticker messages
    if (
      isstring(object.tickertext) &&
      isnumber(object.tickertime) &&
      object.tickertext.length
    ) {
      // calc placement
      const TICKER_WIDTH = BOARD_WIDTH
      const measure = tokenizeandmeasuretextformat(
        object.tickertext,
        TICKER_WIDTH,
        BOARD_HEIGHT,
      )
      const width = (measure?.measuredwidth ?? 1) - 1
      const x = object.x ?? 0
      const y = object.y ?? 0
      const upper = y < BOARD_HEIGHT * 0.5
      tickercontext.x = x - Math.floor(width * 0.5)
      tickercontext.y = y + (upper ? 1 : -1)
      // clip placement
      if (tickercontext.x + width > BOARD_WIDTH) {
        tickercontext.x = BOARD_WIDTH - width
      }
      if (tickercontext.x < 0) {
        tickercontext.x = 0
      }
      // render text
      tokenizeandwritetextformat(object.tickertext, tickercontext, true)
    }

    // inform control layer where to focus
    if (id === player) {
      control.focusx = sprite.x
      control.focusy = sprite.y
      control.focusid = id
    }
  })

  // smooth shadows
  function aa(x: number, y: number) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
      return undefined
    }
    return shadow.alphas[x + y * BOARD_WIDTH]
  }

  const weights = [
    [1, 1, 1, 1, 1],
    [1, 3, 5, 3, 1],
    [1, 5, 12, 5, 1],
    [1, 3, 5, 3, 1],
    [1, 1, 1, 1, 1],
  ].flat()

  const alphas = new Array<number>(shadow.alphas.length)
  for (let i = 0; i < shadow.alphas.length; ++i) {
    // coords
    const cx = i % BOARD_WIDTH
    const cy = Math.floor(i / BOARD_WIDTH)

    // weighted average
    const values = [
      [
        aa(cx - 2, cy - 2),
        aa(cx - 1, cy - 2),
        aa(cx, cy - 2),
        aa(cx + 1, cy - 2),
        aa(cx + 2, cy - 2),
      ],
      [
        aa(cx - 2, cy - 1),
        aa(cx - 1, cy - 1),
        aa(cx, cy - 1),
        aa(cx + 1, cy - 1),
        aa(cx + 2, cy - 1),
      ],
      [
        aa(cx - 2, cy),
        aa(cx - 1, cy),
        aa(cx, cy),
        aa(cx + 1, cy),
        aa(cx + 2, cy),
      ],
      [
        aa(cx - 2, cy + 1),
        aa(cx - 1, cy + 1),
        aa(cx, cy + 1),
        aa(cx + 1, cy + 1),
        aa(cx + 2, cy + 1),
      ],
      [
        aa(cx - 2, cy + 2),
        aa(cx - 1, cy + 2),
        aa(cx, cy + 2),
        aa(cx + 1, cy + 2),
        aa(cx + 2, cy + 2),
      ],
    ]
      .flat()
      .map((value, i) => (ispresent(value) ? value * weights[i] : undefined))
      .filter(ispresent)
    // final shade
    alphas[i] = clamp(average(values), 0, 1)
  }

  // update shadows
  shadow.alphas = alphas

  // return result
  return layers
}

export function memoryreadgadgetlayers(player: string): LAYER[] {
  const mainbook = memoryreadbookbysoftware('main')
  const playerboard = bookplayerreadboard(mainbook, player)

  const layers: LAYER[] = []
  if (!ispresent(mainbook) || !ispresent(playerboard)) {
    return layers
  }

  const borrowbuffer: number[] = new Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0)

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
      borrowbuffer,
    )
    i += view.length
    layers.push(...view)
  }

  return layers
}
