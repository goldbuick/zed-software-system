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
import { MAYBE_STRING, isdefined } from 'zss/mapping/types'
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
  createmainframe,
  createviewframe,
} from './frame'

type CHIP_MEMORY = {
  book: MAYBE_BOOK
  board: MAYBE_BOARD
  target: MAYBE_BOARD_ELEMENT
  inputqueue: Set<INPUT>
  inputmods: Record<INPUT, number>
  activeinput: INPUT | undefined
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

export function memorycreatemainframe(book: string) {
  MEMORY.frames.push(createmainframe(book))
}

export function memorycreateviewframe(
  book: string,
  board: string,
  focus: string,
) {
  MEMORY.frames.push(createviewframe(book, board, focus))
}

export function memorycreateeditframe(book: string, board: string) {
  MEMORY.frames.push(createeditframe(book, board))
}

export function memoryreadmainframes() {
  return unique(
    MEMORY.frames.map((frame) =>
      frame.type === FRAME_TYPE.MAIN ? frame.book : undefined,
    ),
  )
}

export function memoryreadbook(address: string): MAYBE_BOOK {
  const laddress = address.toLowerCase()
  const books = Object.values(MEMORY.books)
  return (
    MEMORY.books.get(address) ||
    books.find((item) => item.name.toLowerCase() === laddress)
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
      activeinput: undefined,
    }
    MEMORY.chips.set(id, chip)
  }

  return chip
}

const PLAYER_KIND = 'player'
const PLAYER_START = 'title'

export function memoryplayerlogin(player: string) {
  memoryreadmainframes().forEach((address) => {
    const book = memoryreadbook(address)
    const title = bookreadboard(book, PLAYER_START)
    const playerkind = bookreadobject(book, PLAYER_KIND)
    if (!title || !playerkind) {
      return
    }

    const obj = createboardobject(title, {
      id: player,
      x: randomInteger(0, title.width - 1),
      y: randomInteger(0, title.height - 1),
      kind: PLAYER_KIND,
      stats: {
        player,
      },
    })

    if (obj?.id) {
      bookplayersetboard(book, player, PLAYER_START)
    }
  })
}

export function memoryplayerlogout(player: string) {
  MEMORY.books.forEach((book) => {
    boarddeleteobject(bookplayerreadboard(book, player), player)
  })
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
    context.activeinput = undefined
    // run chip code
    os.tick(id, code)
  }

  // read which books need updated
  memoryreadmainframes().forEach((address) => {
    const book = memoryreadbook(address)
    if (book) {
      // read boards with players as active list
      const boards = bookplayerreadboards(book)
      // update boards / build code / run chips
      boards.forEach((board) => boardtick(book, board, oncode))
    }
  })
}

export function memoryreadgadgetlayers(player: string): LAYER[] {
  let index = 0
  return MEMORY.frames
    .map((frame) => {
      const layers: LAYER[] = []
      const book = memoryreadbook(frame.book)
      const board = bookreadboard(book, frame.board ?? '')
      if (!isdefined(board)) {
        return layers
      }
      debugger

      const tiles = createtiles(player, index++, board.width, board.height)
      layers.push(tiles)
      const shadow = createdither(player, index++, board.width, board.height)
      layers.push(shadow)
      const objects = createsprites(player, index++)
      layers.push(objects)
      const control = createlayercontrol(player, index++)
      layers.push(control)

      board.terrain.forEach((tile, i) => {
        if (tile) {
          const kind = bookterrainreadkind(book, tile)
          tiles.char[i] = tile.char ?? kind?.char ?? 0
          tiles.color[i] = tile.color ?? kind?.color ?? COLOR.BLACK
          tiles.bg[i] = tile.bg ?? kind?.bg ?? COLOR.BLACK
        }
      })

      Object.values(board.objects).forEach((object) => {
        // should we have bg transparent or match the bg color of the terrain ?
        const id = object.id ?? ''
        const kind = bookobjectreadkind(book, object)
        const sprite = createsprite(player, 2, id)
        const lx = object.lx ?? object.x ?? 0
        const ly = object.ly ?? object.y ?? 0
        sprite.x = object.x ?? 0
        sprite.y = object.y ?? 0
        sprite.char = object.char ?? kind?.char ?? 1
        sprite.color = object.color ?? kind?.color ?? COLOR.WHITE
        sprite.bg = object.bg ?? kind?.bg ?? COLOR.CLEAR
        objects.sprites.push(sprite)

        // plot shadow
        if (sprite.bg === COLOR.SHADOW) {
          shadow.alphas[lx + ly * board.width] = 0.5
        }

        // inform control layer where to focus
        if (id === player) {
          control.focusx = sprite.x
          control.focusy = sprite.y
        }
      })

      return layers
    })
    .flat()
}
