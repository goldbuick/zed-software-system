import { proxy } from 'valtio'
import { PT, ispt } from 'zss/firmware/wordtypes'
import { INPUT } from 'zss/gadget/data/types'
import { randomInteger } from 'zss/mapping/number'
import { isdefined } from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  createboardobject,
  boarddeleteobject,
  MAYBE_BOARD_ELEMENT,
  boardreadobject,
  BOARD,
  BOARD_ELEMENT,
  boardmoveobject,
  MAYBE_BOARD,
  boardtick,
} from './board'
import {
  BOOK,
  MAYBE_BOOK,
  bookobjectreadkind,
  bookplayerreadboards,
  bookreadcodepage,
  bookreadflags,
  bookterrainreadkind,
} from './book'
import { CODE_PAGE_TYPE } from './codepage'
import { FRAME_STATE } from './frame'

type CHIP_MEMORY = {
  board: BOARD | undefined
  target: BOARD_ELEMENT | undefined
  inputqueue: Set<INPUT>
  inputmods: Record<INPUT, number>
  activeinput: INPUT | undefined
}

const MEMORY = proxy({
  defaultplayer: '',
  frames: [] as FRAME_STATE[],
  books: new Map<string, BOOK>(),
  chips: new Map<string, CHIP_MEMORY>(),
})

export function memorysetdefaultplayer(player: string) {
  MEMORY.defaultplayer = player
}

export function memoryreadbook(address: string): MAYBE_BOOK {
  const laddress = address.toLowerCase()
  return (
    MEMORY.books.get(address) ||
    Object.values(MEMORY.books).find(
      (item) => item.name.toLowerCase() === laddress,
    )
  )
}

export function memoryreadchip(id: string) {
  let chip = MEMORY.chips.get(id)

  if (!isdefined(chip)) {
    chip = {
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

export function memoryreadflags(address: string, player: string) {
  return bookreadflags(memoryreadbook(address), player)
}

const PLAYER_KIND = 'player'
const PLAYER_START = 'title'

export function memoryplayerlogin(address: string, player: string) {
  const title = memoryreadboard(address, PLAYER_START)
  const playerkind = memoryreadobject(address, PLAYER_KIND)
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
    memoryplayersetboard(address, player, PLAYER_START)
  }
}

export function memoryplayerlogout(address: string, player: string) {
  const board = memoryplayerreadboard(address, player)
  if (board) {
    boarddeleteobject(board, player)
  }
}

export function memoryplayerreadflag(
  address: string,
  player: string | undefined,
  flag: string,
) {
  const flags = memoryreadflags(address, player ?? MEMORY.defaultplayer)
  return flags?.[flag]
}

export function memoryplayersetflag(
  address: string,
  player: string | undefined,
  flag: string,
  value: any,
) {
  const flags = memoryreadflags(address, player ?? MEMORY.defaultplayer)
  if (flags) {
    flags[flag] = value
  }
}

export function memoryplayerreadboard(address: string, player: string) {
  return memoryreadboard(address, memoryreadbook(address)?.players[player])
}

export function memoryplayersetboard(
  address: string,
  player: string,
  board: string,
) {
  const book = memoryreadbook(address)
  if (!book || !memoryreadboard(address, board)) {
    return undefined
  }
  book.players[player] = board
}

export function memoryplayerreadobject(address: string, player: string) {
  return boardreadobject(memoryplayerreadboard(address, player), player)
}

export function memoryreadboard(address: string, name: string | undefined) {
  return bookreadcodepage(
    memoryreadbook(address),
    CODE_PAGE_TYPE.BOARD,
    name ?? '',
  )
}

export function memoryterrainreadkind(
  address: string,
  terrain: MAYBE_BOARD_ELEMENT,
) {
  return bookterrainreadkind(memoryreadbook(address), terrain)
}

export function memoryreadobject(address: string, name: string) {
  return bookreadcodepage(memoryreadbook(address), CODE_PAGE_TYPE.OBJECT, name)
}

export function memoryobjectreadkind(
  address: string,
  object: MAYBE_BOARD_ELEMENT,
) {
  return bookobjectreadkind(memoryreadbook(address), object)
}

export function memoryboardmoveobject(
  address: string,
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dest: PT | undefined,
) {
  const book = memoryreadbook(address)
  if (!isdefined(book) || !isdefined(board) || !ispt(dest)) {
    return false
  }
  return boardmoveobject(book, board, target, dest)
}

export function memorytick(os: OS, address: string) {
  // glue code between memory, os, and boardtick
  function oncode(
    board: BOARD,
    target: BOARD_ELEMENT,
    id: string,
    code: string,
  ) {
    // set context
    const context = memoryreadchip(id)
    context.activeinput = undefined
    context.board = board
    context.target = target
    // run chip code
    os.tick(id, code)
  }

  const book = memoryreadbook(address)
  if (book) {
    bookplayerreadboards(book).forEach((board) =>
      boardtick(book, board, oncode),
    )
  }
}
