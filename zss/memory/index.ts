import { CHIP } from 'zss/chip'
import { api_error, tape_debug, tape_info } from 'zss/device/api'
import { DRIVER_TYPE } from 'zss/firmware/boot'
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
  MAYBE_BOARD,
  boardelementname,
  boardobjectcreatefromkind,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BOARD,
} from './board'
import { MAYBE_BOARD_ELEMENT, boardelementreadstat } from './boardelement'
import {
  BOOK,
  MAYBE_BOOK,
  bookboardtick,
  bookelementkindread,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadcodepagesbytype,
  bookreadobject,
} from './book'
import { CODE_PAGE_TYPE, codepagereadstats } from './codepage'
import { EIGHT_TRACK } from './eighttrack'
import {
  mimetypeofbytesread,
  parsebinaryfile,
  parsetextfile,
  parsezipfile,
} from './parsefile'
import { WORD } from './word'

type BINARY_READER = {
  filename: string
  offset: number
  bytes: Uint8Array
  dataview: DataView
}

type CHIP_TARGETS = {
  // memory
  book: MAYBE_BOOK
  // codepages
  board: MAYBE_BOARD
  object: MAYBE_BOARD_ELEMENT
  terrain: MAYBE_BOARD_ELEMENT
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

type CHIP_MEMORY = CHIP_TARGETS & CHIP_PLAYER_INPUT

export enum MEMORY_LABEL {
  MAIN = 'main',
  TITLE = 'title',
  PLAYER = 'player',
}

const MEMORY = {
  // running software
  defaultplayer: createpid(),
  books: new Map<string, BOOK>(),
  chips: new Map<string, CHIP_MEMORY>(),
  // active loaders
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

export function memoryreadbookbyaddress(address: string): MAYBE_BOOK {
  const laddress = address.toLowerCase()
  return (
    MEMORY.books.get(address) ??
    memoryreadbooklist().find((item) => item.name.toLowerCase() === laddress)
  )
}

export function memoryresetbooks(books: BOOK[]) {
  MEMORY.books.clear()
  books.forEach((book) => {
    MEMORY.books.set(book.id, book)
  })
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
      // player input
      player: MEMORY.defaultplayer,
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

  const mainbook = memoryreadbookbyaddress('main')
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
  if (ispresent(obj?.id) && ispresent(titleboard.id)) {
    bookplayersetboard(mainbook, player, titleboard.id)
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
  const mainbook = memoryreadbookbyaddress('main')
  const boards = bookplayerreadboards(mainbook)
  for (let i = 0; i < boards.length; ++i) {
    const board = boards[i]
    const boardid = board.id ?? ''
    const objects = Object.keys(board.objects)
    for (let o = 0; o < objects.length; ++o) {
      const object = board.objects[objects[o]]
      const objectid = object.id
      if (ispid(objectid) && ispresent(players[objectid]) === false) {
        players[objectid] = 0
        bookplayersetboard(mainbook, objectid, boardid)
      }
    }
  }
}

export function memorytick(os: OS, timestamp: number) {
  // update loaders
  MEMORY.loaders.forEach((code, id) => {
    os.tick(id, DRIVER_TYPE.LOADER, 1, timestamp, 'loader', code)
    // teardown
    if (os.isended(id)) {
      os.halt(id)
      MEMORY.loaders.delete(id)
    }
  })

  const mainbook = memoryreadbookbyaddress('main')
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

      // map stats
      const maybekind = bookelementkindread(mainbook, item.object)
      const maybekindcycle = boardelementreadstat(maybekind, 'cycle', undefined)
      const maybeplayer = boardelementreadstat(item.object, 'player', undefined)
      const maybecycle = boardelementreadstat(
        item.object,
        'cycle',
        maybekindcycle,
      )

      // update player from board element
      context.player = isstring(maybeplayer) ? maybeplayer : context.player

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
  // we try and execute cli invokes in main
  // its okay if we do not find main
  const mainbook = memoryreadbookbyaddress('main')

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
  const mainbook = memoryreadbookbyaddress('main')
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
      offset: 0,
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
  const mainbook = memoryreadbookbyaddress('main')
  const playerboard = bookplayerreadboard(mainbook, player)

  const layers: LAYER[] = []
  if (!ispresent(mainbook) || !ispresent(playerboard)) {
    return layers
  }

  // todo: fix this with over / under boards
  const borrowbuffer: number[] = new Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0)

  let i = 0
  const view = memoryconverttogadgetlayers(
    player,
    i,
    mainbook,
    playerboard,
    true,
    borrowbuffer,
  )
  i += view.length
  layers.push(...view)

  return layers
}
