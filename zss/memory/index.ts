import { CHIP, CONFIG } from 'zss/chip'
import { api_error, tape_debug, tape_info } from 'zss/device/api'
import { DRIVER_TYPE } from 'zss/firmware/boot'
import {
  mimetypeofbytesread,
  parsebinaryfile,
  parsetextfile,
  parsezipfile,
} from 'zss/firmware/parsefile'
import { createreadcontext } from 'zss/firmware/wordtypes'
import { BITMAP } from 'zss/gadget/data/bitmap'
import {
  COLOR,
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
  INPUT,
  LAYER,
} from 'zss/gadget/data/types'
import { average } from 'zss/mapping/array'
import { createpid, ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { CYCLE_DEFAULT } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  boarddeleteobject,
  boardelementname,
  boardobjectcreatefromkind,
} from './board'
import { boardelementreadstat } from './boardelement'
import {
  bookboardtick,
  bookelementkindread,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadcodepagesbytype,
  bookreadobject,
  createbook,
} from './book'
import { codepagereadstats } from './codepage'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
  EIGHT_TRACK,
  WORD,
} from './types'

type BINARY_READER = {
  filename: string
  cursor: number
  bytes: Uint8Array
  dataview: DataView
}

type CHIP_TARGETS = {
  // memory
  book: MAYBE<BOOK>
  // codepages
  board: MAYBE<BOARD>
  object: MAYBE<BOARD_ELEMENT>
  terrain: MAYBE<BOARD_ELEMENT>
  charset: MAYBE<BITMAP>
  palette: MAYBE<BITMAP>
  eighttrack: MAYBE<EIGHT_TRACK>
  // loaders
  binaryfile: MAYBE<BINARY_READER>
}

type CHIP_PLAYER_INPUT = {
  player: string
  inputmods: Record<INPUT, number>
  inputqueue: Set<INPUT>
  inputcurrent: MAYBE<INPUT>
}

export type CHIP_MEMORY = CHIP_TARGETS & CHIP_PLAYER_INPUT

export enum MEMORY_LABEL {
  TITLE = 'title',
  PLAYER = 'player',
}

const MEMORY = {
  defaultplayer: createpid(),
  software: {
    main: '',
    content: '',
  },
  books: new Map<string, BOOK>(),
  chips: new Map<string, CHIP_MEMORY>(),
  loaders: new Map<string, string>(),
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

export function memoryensuresoftwarebook(
  slot: keyof typeof MEMORY.software,
  maybename?: string,
) {
  let book = memoryreadbookbysoftware(slot)

  // slot is set
  if (ispresent(book)) {
    return book
  }

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

export function memoryreadchip(id: string): CHIP_MEMORY {
  let chip = MEMORY.chips.get(id)

  if (!ispresent(chip)) {
    chip = {
      // targets
      book: undefined,
      board: undefined,
      object: undefined,
      terrain: undefined,
      charset: undefined,
      palette: undefined,
      eighttrack: undefined,
      // loaders
      binaryfile: undefined,
      // player aggro
      player: MEMORY.defaultplayer,
      // user input
      inputqueue: new Set(),
      inputmods: {
        [INPUT.NONE]: 0,
        [INPUT.MOVE_UP]: 0,
        [INPUT.MOVE_DOWN]: 0,
        [INPUT.MOVE_LEFT]: 0,
        [INPUT.MOVE_RIGHT]: 0,
        [INPUT.OK_BUTTON]: 0,
        [INPUT.CANCEL_BUTTON]: 0,
        [INPUT.MENU_BUTTON]: 0,
      },
      inputcurrent: undefined,
    }
    MEMORY.chips.set(id, chip)
  }

  return chip
}

export function memoryreadcontext(chip: CHIP, words: WORD[]) {
  const memory = memoryreadchip(chip.id())
  return createreadcontext(memory, words, chip.get)
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
  MEMORY.books.forEach((book) => {
    const board = bookplayerreadboard(book, player)
    boarddeleteobject(board, player)
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

  const mainbook = memoryreadbookbysoftware('main')
  const boards = bookplayerreadboards(mainbook)

  // update boards / build code / run chips
  boards.forEach((board) => {
    const run = bookboardtick(mainbook, board, timestamp)

    // iterate code needed to update given board
    for (let i = 0; i < run.length; ++i) {
      const item = run[i]

      // create / update context
      const context = memoryreadchip(item.id)
      context.book = mainbook
      context.board = board
      context.object = item.object
      context.inputcurrent = undefined

      // read cycle from element kind
      const maybekindcycle = boardelementreadstat(
        bookelementkindread(mainbook, item.object),
        'cycle',
        undefined,
      )

      // read cycle from element
      const maybecycle = boardelementreadstat(
        item.object,
        'cycle',
        maybekindcycle,
      )

      // run chip code
      const itemname = boardelementname(item.object)
      os.tick(
        item.id,
        DRIVER_TYPE.CODE_PAGE,
        isnumber(maybecycle) ? maybecycle : CYCLE_DEFAULT,
        timestamp,
        itemname,
        item.code,
      )
    }
  })
}

export function memorycli(
  os: OS,
  timestamp: number,
  player: string,
  cli: string,
) {
  memoryensuresoftwarebook('main')

  // we try and execute cli invokes in main
  // its okay if we do not find main
  const mainbook = memoryreadbookbysoftware('main')

  // player id + unique id fo run
  const id = `${player}_cli`

  // create / update context
  const context = memoryreadchip(id)

  context.player = player
  context.book = mainbook
  context.board = undefined
  context.inputcurrent = undefined

  tape_debug('memory', 'running', timestamp, id, cli)

  // run chip code
  os.once(id, DRIVER_TYPE.CLI, timestamp, 'cli', cli)
}

function memoryloader(
  timestamp: number,
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

    // create / update context
    const context = memoryreadchip(id)

    context.player = player
    context.book = mainbook
    context.board = undefined
    context.binaryfile = {
      filename: file.name,
      cursor: 0,
      bytes: binaryfile,
      dataview: new DataView(binaryfile.buffer),
    }
    context.inputcurrent = undefined

    tape_info('memory', 'starting loader', timestamp, id)

    // add code to active loaders
    MEMORY.loaders.set(id, loader.code)
  }
}

export function memoryloadfile(
  timestamp: number,
  player: string,
  file: File | undefined,
) {
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
        parsezipfile(file, (zipfile) =>
          memoryloadfile(timestamp, player, zipfile),
        ).catch((err) => api_error('memory', 'crash', err.message))
        break
      case 'application/octet-stream':
        parsebinaryfile(file, (fileext, binaryfile) => {
          memoryloader(timestamp, player, file, fileext, binaryfile)
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
    const kind = bookelementkindread(book, object)
    const sprite = createsprite(player, objectindex, id)
    const lx = object.lx ?? object.x ?? 0
    const ly = object.ly ?? object.y ?? 0
    const li = lx + ly * BOARD_WIDTH

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = object.char ?? kind?.char ?? 1
    sprite.color = object.color ?? kind?.color ?? COLOR.WHITE
    sprite.bg = object.bg ?? kind?.bg ?? COLOR.BORROW
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

  // TODO: add support for book address prefixes
  //   ie: #set under grunkle:title  <-  this will display the title board from the grunkle book
  //                                     the thought here is this gives the mods api a new target to use
  //                                     #mod under, #mod over, note that #mod self resets all changes #mod
  //                                     has done to the chip memory context

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
