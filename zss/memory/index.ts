import { proxy } from 'valtio'
import { BIOS } from 'zss/bios'
import { WORD_VALUE } from 'zss/chip'
import { PT, ispt } from 'zss/firmware/wordtypes'
import { INPUT } from 'zss/gadget/data/types'
import { randomInteger } from 'zss/mapping/number'
import { isdefined } from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  createboardobject,
  boarddeleteobject,
  boardtick,
  MAYBE_BOARD_ELEMENT,
  boardreadobject,
  BOARD,
  BOARD_ELEMENT,
  boardmoveobject,
  MAYBE_BOARD,
} from './board'
import {
  bookobjectreadkind,
  bookterrainreadkind,
  bookreadaddress,
} from './book'
import { CONTENT_TYPE } from './codepage'

/*
BOOK OF CODEPAGES
A CODEPAGE is CODE + VALUE
*/

// shared chip state
type MEMORY_CHIP = {
  board: BOARD | undefined
  target: BOARD_ELEMENT | undefined
  inputqueue: Set<INPUT>
  inputmods: Record<INPUT, number>
  activeinput: INPUT | undefined
}

// we have memory slots
// a slot is either a runner or editor

const MEMORY = proxy({
  // book: BIOS, // starting software to run
  // defaultplayer: '', // default player aggro
  chips: {} as Record<string, MEMORY_CHIP>, // execution context for a chip
  // flags: {} as Record<string, MEMORY_FLAGS>, // global flags by player
  // players: {} as Record<string, MEMORY_PLAYER>, // map of player to board
})

export function memorysetdefaultplayer(player: string) {
  console.info({ player })
  // MEMORY.defaultplayer = player
}

export function memoryreadchip(id: string) {
  if (!MEMORY.chips[id]) {
    MEMORY.chips[id] = {
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
  }
  return MEMORY.chips[id]
}

export function memoryreadflags(player: string) {
  if (!MEMORY.flags[player]) {
    MEMORY.flags[player] = {}
  }
  return MEMORY.flags[player]
}

const PLAYER_KIND = 'app:player'
const PLAYER_START = 'app:title'

export function memoryplayerlogin(player: string) {
  const title = memoryreadboard(PLAYER_START)
  const playerkind = memoryreadobject(PLAYER_KIND)
  if (title && playerkind) {
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
      MEMORY.players[player] = PLAYER_START
    }
  }
}

export function memoryplayerlogout(player: string) {
  const board = memoryplayerreadboard(player)
  if (board) {
    boarddeleteobject(board, player)
  }
}

export function memoryplayerreadflag(player: string | undefined, flag: string) {
  const flags = memoryreadflags(player ?? MEMORY.defaultplayer)
  return flags[flag]
}

export function memoryplayersetflag(
  player: string | undefined,
  flag: string,
  value: any,
) {
  const flags = memoryreadflags(player ?? MEMORY.defaultplayer)
  flags[flag] = value
}

export function memoryplayerreadboard(player: string) {
  return memoryreadboard(MEMORY.players[player] ?? '')
}

export function memoryplayersetboard(player: string, board: string) {
  if (memoryreadboard(board)) {
    MEMORY.players[player] = board
  }
}

export function memoryplayerreadobject(player: string) {
  const board = memoryplayerreadboard(player)
  return board ? boardreadobject(board, player) : undefined
}

export function memoryreadboard(address: string) {
  return bookreadaddress(MEMORY.book, CONTENT_TYPE.BOARD, address)
}

export function memoryterrainreadkind(terrain: MAYBE_BOARD_ELEMENT) {
  return bookterrainreadkind(MEMORY.book, terrain)
}

export function memoryreadobject(address: string) {
  return bookreadaddress(MEMORY.book, CONTENT_TYPE.OBJECT, address)
}

export function memoryobjectreadkind(object: MAYBE_BOARD_ELEMENT) {
  return bookobjectreadkind(MEMORY.book, object)
}

export function memoryboardmoveobject(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dest: PT | undefined,
) {
  if (!isdefined(board) || !ispt(dest)) {
    return false
  }
  return boardmoveobject(MEMORY.book, board, target, dest)
}

export function memorytick(os: OS) {
  // get a list of active boards
  const activelist = [...new Set(Object.values(MEMORY.players))]

  // glue code between memory and boardtick
  function oncode(
    board: BOARD,
    target: BOARD_ELEMENT,
    id: string,
    code: string,
  ) {
    // chip check
    if (!os.has(id)) {
      os.boot(id, code)
    }

    // set context
    const context = memoryreadchip(id)
    context.activeinput = undefined
    context.board = board
    context.target = target

    // run chip
    os.tick(id)
  }

  activelist
    .map((address) => memoryreadboard(address))
    .filter(isdefined)
    .forEach((board) => boardtick(MEMORY.book, board, oncode))
}
