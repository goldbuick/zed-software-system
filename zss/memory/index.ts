import { CHIP, MESSAGE } from 'zss/chip'
import { api_error, tape_debug } from 'zss/device/api'
import { WORD, createreadcontext } from 'zss/firmware/wordtypes'
import { BITMAP } from 'zss/gadget/data/bitmap'
import {
  COLOR,
  INPUT,
  LAYER,
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import { average, unique } from 'zss/mapping/array'
import { clamp } from 'zss/mapping/number'
import { MAYBE, MAYBE_STRING, ispresent, isstring } from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  boardobjectcreate,
  boarddeleteobject,
  MAYBE_BOARD_ELEMENT,
  BOARD,
  MAYBE_BOARD,
} from './board'
import {
  BOOK,
  MAYBE_BOOK,
  bookboardtick,
  bookelementkindread,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadobject,
} from './book'
import { CODE_PAGE_TYPE } from './codepage'
import {
  FRAME_STATE,
  FRAME_TYPE,
  createeditframe,
  createviewframe,
} from './frame'

type CHIP_TARGETS = {
  book: MAYBE_BOOK
  board: MAYBE_BOARD
  object: MAYBE_BOARD_ELEMENT
  terrain: MAYBE_BOARD_ELEMENT
  charset: MAYBE<BITMAP>
  palette: MAYBE<BITMAP>
}

type CHIP_USER_INPUT = {
  inputmods: Record<INPUT, number>
  inputqueue: Set<INPUT>
  inputcurrent: MAYBE<INPUT>
}

type CHIP_MEMORY = CHIP_TARGETS & CHIP_USER_INPUT

const MEMORY = {
  defaultplayer: '',
  books: new Map<string, BOOK>(),
  chips: new Map<string, CHIP_MEMORY>(),
  frames: new Map<string, FRAME_STATE[]>(),
}

export function memorysetdefaultplayer(player: string) {
  MEMORY.defaultplayer = player
}

export function memoryresetframes(board: string): FRAME_STATE[] {
  const frames: FRAME_STATE[] = [createviewframe(undefined, undefined)]
  MEMORY.frames.set(board, frames)
  return frames
}

export function memorycreateviewframe(
  board: string,
  book: MAYBE_STRING,
  view: MAYBE_STRING,
) {
  const frames = memoryreadframes(board)
  if (ispresent(frames)) {
    frames.push(createviewframe(book, view))
  }
}

export function memorycreateeditframe(
  board: string,
  book: MAYBE_STRING,
  edit: MAYBE_STRING,
) {
  const frames = memoryreadframes(board)
  if (ispresent(frames)) {
    frames.push(createeditframe(book, edit))
  }
}

export function memoryreadframes(board: string) {
  return MEMORY.frames.get(board) ?? memoryresetframes(board)
}

export function memoryreadbook(address: string): MAYBE_BOOK {
  const laddress = address.toLowerCase()
  return (
    MEMORY.books.get(address) ??
    [...MEMORY.books.values()].find(
      (item) => item.name.toLowerCase() === laddress,
    )
  )
}

export function memoryreadbooks(addresses: MAYBE_STRING[]) {
  return unique(addresses).map(memoryreadbook).filter(ispresent)
}

export function memoryresetbooks(book: BOOK) {
  MEMORY.books.clear()
  MEMORY.books.set(book.id, book)
  return book.id
}

export function memorysetbook(book: BOOK) {
  MEMORY.books.set(book.id, book)
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbook(address)
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

const PLAYER_BOOK = 'main'
const PLAYER_KIND = 'player'
const PLAYER_START = 'title'

export function memoryplayerlogin(player: string): boolean {
  if (!isstring(player) || !player) {
    return api_error(
      'memory',
      'login',
      `failed for playerid ==>${player}<==`,
      player,
    )
  }

  const book = memoryreadbook(PLAYER_BOOK)
  if (!ispresent(book)) {
    return api_error(
      'memory',
      'login',
      `login failed to find book ${PLAYER_BOOK}`,
      player,
    )
  }

  const start = bookreadboard(book, PLAYER_START)
  if (!ispresent(start)) {
    return api_error(
      'memory',
      'login',
      `login failed to find board ${PLAYER_START}`,
      player,
    )
  }

  const playerkind = bookreadobject(book, PLAYER_KIND)
  if (!ispresent(playerkind)) {
    return api_error(
      'memory',
      'login',
      `login failed to find object type ${PLAYER_KIND}`,
      player,
    )
  }

  // TODO: what is a sensible way to place here ?
  // via player token I think ..

  const obj = boardobjectcreate(start, {
    id: player,
    x: 0,
    y: 0,
    kind: PLAYER_KIND,
    stats: {
      player,
    },
  })

  if (ispresent(obj?.id)) {
    bookplayersetboard(book, player, PLAYER_START)
  }

  return true
}

export function memoryplayerlogout(player: string) {
  MEMORY.books.forEach((book) =>
    boarddeleteobject(bookplayerreadboard(book, player), player),
  )
}

export function memorytick(os: OS, timestamp: number) {
  // update boards / build code / run chips
  const book = memoryreadbook(PLAYER_BOOK)
  bookplayerreadboards(book).forEach((board) => {
    const run = bookboardtick(book, board, timestamp)

    // iterate code needed to update given board
    for (let i = 0; i < run.length; ++i) {
      const item = run[i]

      // create / update context
      const context = memoryreadchip(item.id)
      context.book = book
      context.board = board
      context.object = item.object
      context.inputcurrent = undefined

      // run chip code
      os.tick(item.id, item.type, timestamp, item.code)
    }
  })
}

export function memorycli(
  os: OS,
  timestamp: number,
  player: string,
  cli: string,
) {
  // player id + unique id fo run
  const id = `${player}_func`

  // create / update context
  const context = memoryreadchip(id)
  context.book = undefined
  context.board = undefined
  context.inputcurrent = undefined

  tape_debug('memory', 'running', timestamp, id, cli)

  // run chip code
  os.once(id, CODE_PAGE_TYPE.CLI, timestamp, cli)
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
  const boardwidth = board.width ?? 0
  const boardheight = board.height ?? 0
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
    const li = lx + ly * board.width

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
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
      return undefined
    }
    return shadow.alphas[x + y * board.width]
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
    const cx = i % board.width
    const cy = Math.floor(i / board.width)

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

function framerank(frame: FRAME_STATE): number {
  switch (frame.type) {
    case FRAME_TYPE.EDIT:
      return 1
    case FRAME_TYPE.VIEW:
      return 2
  }
  return 0
}

export function memoryreadgadgetlayers(player: string): LAYER[] {
  const book = memoryreadbook(PLAYER_BOOK)
  const board = bookplayerreadboard(book, player)

  const layers: LAYER[] = []
  if (!ispresent(book) || !ispresent(board)) {
    return layers
  }

  let i = 0
  const frames = [...memoryreadframes(board.id ?? '')]
  const borrowbuffer: number[] = new Array(board.width * board.height).fill(0)

  frames.sort((a, b) => framerank(a) - framerank(b))
  frames.forEach((frame) => {
    const withbook = memoryreadbook(frame.book ?? '') ?? book
    const withboard = bookreadboard(withbook, frame.board ?? '') ?? board
    if (ispresent(withbook) && ispresent(withboard)) {
      const view = memoryconverttogadgetlayers(
        player,
        i,
        withbook,
        withboard,
        frame.type === FRAME_TYPE.VIEW,
        borrowbuffer,
      )
      i += view.length
      layers.push(...view)
    }
  })

  return layers
}
