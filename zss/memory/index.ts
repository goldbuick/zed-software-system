import { proxy } from 'valtio'
import { COLOR } from 'zss/firmware/wordtypes'
import {
  INPUT,
  LAYER,
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import { unique } from 'zss/mapping/array'
import { randomInteger } from 'zss/mapping/number'
import { MAYBE, MAYBE_STRING, isdefined } from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  createboardobject,
  boarddeleteobject,
  MAYBE_BOARD_ELEMENT,
  BOARD,
  BOARD_ELEMENT,
  MAYBE_BOARD,
  boardtick,
} from './board'
import {
  BOOK,
  MAYBE_BOOK,
  bookobjectreadkind,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboard,
  bookreadobject,
  bookterrainreadkind,
} from './book'
import {
  FRAME_STATE,
  FRAME_TYPE,
  createeditframe,
  createviewframe,
} from './frame'

type CHIP_MEMORY = {
  book: MAYBE_BOOK
  board: MAYBE_BOARD
  target: MAYBE_BOARD_ELEMENT
  inputmods: Record<INPUT, number>
  inputqueue: Set<INPUT>
  inputcurrent: MAYBE<INPUT>
}

const MEMORY = proxy({
  defaultplayer: '',
  books: new Map<string, BOOK>(),
  chips: new Map<string, CHIP_MEMORY>(),
  frames: new Map<string, FRAME_STATE[]>(),
})

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
  book?: string,
  view?: string,
) {
  const frames = memoryreadframes(board)
  if (isdefined(frames)) {
    frames.push(createviewframe(book, view))
  }
}

export function memorycreateeditframe(
  board: string,
  book?: string,
  edit?: string,
) {
  const frames = memoryreadframes(board)
  if (isdefined(frames)) {
    frames.push(createeditframe(book, edit))
  }
}

export function memoryreadframes(board: string) {
  return MEMORY.frames.get(board) ?? memoryresetframes(board)
}

export function memoryreadbook(address: string): MAYBE_BOOK {
  const laddress = address.toLowerCase()
  return (
    MEMORY.books.get(address) ||
    [...MEMORY.books.values()].find(
      (item) => item.name.toLowerCase() === laddress,
    )
  )
}

export function memoryreadbooks(addresses: MAYBE_STRING[]) {
  return unique(addresses).map(memoryreadbook).filter(isdefined)
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

  if (!isdefined(chip)) {
    chip = {
      book: undefined,
      board: undefined,
      target: undefined,
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

const PLAYER_BOOK = 'BIOS'
const PLAYER_KIND = 'player'
const PLAYER_START = 'title'

export function memoryplayerlogin(player: string) {
  const book = memoryreadbook(PLAYER_BOOK)
  const start = bookreadboard(book, PLAYER_START)
  const playerkind = bookreadobject(book, PLAYER_KIND)
  if (isdefined(start) && isdefined(playerkind)) {
    // TODO: what is a sensible way to place here ?
    const obj = createboardobject(start, {
      id: player,
      x: 0,
      y: 0,
      kind: PLAYER_KIND,
      stats: {
        player,
      },
    })
    if (isdefined(obj?.id)) {
      bookplayersetboard(book, player, PLAYER_START)
    }
  }
}

export function memoryplayerlogout(player: string) {
  MEMORY.books.forEach((book) =>
    boarddeleteobject(bookplayerreadboard(book, player), player),
  )
}

export function memorytick(os: OS) {
  // glue code between memory, os, and boardtick
  function oncode(
    book: BOOK,
    board: BOARD,
    target: BOARD_ELEMENT,
    id: string,
    code: string,
  ) {
    // set context
    const context = memoryreadchip(id)
    context.book = book
    context.board = board
    context.target = target
    context.inputcurrent = undefined
    // run chip code
    os.tick(id, code)
  }

  // update boards / build code / run chips
  const book = memoryreadbook(PLAYER_BOOK)
  bookplayerreadboards(book).forEach((board) => boardtick(book, board, oncode))
}

function memoryconverttogadgetlayers(
  player: string,
  index: number,
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  isprimary: boolean,
): LAYER[] {
  const layers: LAYER[] = []

  let i = index
  const boardwidth = board?.width ?? 0
  const boardheight = board?.height ?? 0
  const defaultcolor = isprimary ? COLOR.BLACK : COLOR.CLEAR

  const tiles = createtiles(player, i++, boardwidth, boardheight, defaultcolor)
  layers.push(tiles)

  const shadow = createdither(player, i++, boardwidth, boardheight)
  layers.push(shadow)

  const objectindex = i++
  const objects = createsprites(player, objectindex)
  layers.push(objects)

  const control = createlayercontrol(player, i++)
  if (isprimary) {
    // hack to keep only one control layer
    layers.push(control)
  }

  board?.terrain.forEach((tile, i) => {
    if (tile) {
      const kind = bookterrainreadkind(book, tile)
      tiles.char[i] = tile.char ?? kind?.char ?? 0
      tiles.color[i] = tile.color ?? kind?.color ?? defaultcolor
      tiles.bg[i] = tile.bg ?? kind?.bg ?? defaultcolor
    }
  })

  const withobjects = board?.objects ?? {}
  Object.values(withobjects).forEach((object) => {
    // should we have bg transparent or match the bg color of the terrain ?
    const id = object.id ?? ''
    const kind = bookobjectreadkind(book, object)
    const sprite = createsprite(player, objectindex, id)
    const lx = object.lx ?? object.x ?? 0
    const ly = object.ly ?? object.y ?? 0

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = object.char ?? kind?.char ?? 1
    sprite.color = object.color ?? kind?.color ?? COLOR.WHITE
    sprite.bg = object.bg ?? kind?.bg ?? COLOR.CLEAR
    objects.sprites.push(sprite)

    // plot shadow
    if (sprite.bg === COLOR.SHADOW) {
      shadow.alphas[lx + ly * boardwidth] = 0.5
    }

    // inform control layer where to focus
    if (id === player) {
      control.focusx = sprite.x
      control.focusy = sprite.y
      control.focusid = id
    }
  })

  return layers
}

export function memoryreadgadgetlayers(player: string): LAYER[] {
  const book = memoryreadbook(PLAYER_BOOK)
  const board = bookplayerreadboard(book, player)

  const layers: LAYER[] = []
  if (!isdefined(book) || !isdefined(board)) {
    return layers
  }

  let i = 0
  const frames = memoryreadframes(board.id ?? '')
  frames.forEach((frame) => {
    const withbook = memoryreadbook(frame.book ?? '') ?? book
    const withboard = bookreadboard(withbook, frame.board ?? '') ?? board
    const view = memoryconverttogadgetlayers(
      player,
      i,
      withbook,
      withboard,
      frame.type === FRAME_TYPE.VIEW,
    )
    i += view.length
    layers.push(...view)
  })

  return layers
}
