import { isDefined } from 'ts-extras'
import { proxy } from 'valtio'

import { BIOS } from './bios'
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
import { bookobjectreadkind, bookterrainreadkind, readaddress } from './book'
import { WORD_VALUE } from './chip'
import { CONTENT_TYPE } from './codepage'
import { STR_DIR } from './firmware/wordtypes'
import { INPUT } from './gadget/data/types'
import { randomInteger } from './mapping/number'
import { OS } from './os'

// shared chip state
type MEMORY_CHIP = {
  board: BOARD | undefined
  target: BOARD_ELEMENT | undefined
  playerfocus: string
  inputqueue: Set<INPUT>
  activeinput: INPUT | undefined
}

// player state
type MEMORY_FLAGS = Record<string, WORD_VALUE>

// player tracking
type MEMORY_PLAYER = string

// sim state
const MEMORY = proxy({
  book: BIOS, // starting software to run
  defaultplayer: '', // default player aggro
  chips: {} as Record<string, MEMORY_CHIP>, // execution context for a chip
  flags: {} as Record<string, MEMORY_FLAGS>, // global flags by player
  players: {} as Record<string, MEMORY_PLAYER>, // map of player to board
})

export function memorysetdefaultplayer(player: string) {
  MEMORY.defaultplayer = player
}

export function memoryreadchip(id: string) {
  if (!MEMORY.chips[id]) {
    MEMORY.chips[id] = {
      board: undefined,
      target: undefined,
      playerfocus: MEMORY.defaultplayer,
      inputqueue: new Set(),
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

export function memoryplayerreadflag(player: string, flag: string) {
  const flags = memoryreadflags(player)
  return flags[flag]
}

export function memoryplayersetflag(player: string, flag: string, value: any) {
  const flags = memoryreadflags(player)
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
  return readaddress(MEMORY.book, CONTENT_TYPE.BOARD, address)
}

export function memoryterrainreadkind(terrain: MAYBE_BOARD_ELEMENT) {
  return bookterrainreadkind(MEMORY.book, terrain)
}

export function memoryreadobject(address: string) {
  return readaddress(MEMORY.book, CONTENT_TYPE.OBJECT, address)
}

export function memoryobjectreadkind(object: MAYBE_BOARD_ELEMENT) {
  return bookobjectreadkind(MEMORY.book, object)
}

export function memoryboardmoveobject(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dir: STR_DIR | undefined,
) {
  if (!isDefined(board) || !isDefined(dir)) {
    return false
  }
  return boardmoveobject(MEMORY.book, board, target, dir)
}

export function memorytick(os: OS) {
  // get a list of active boards
  const activelist = [...new Set(Object.values(MEMORY.players))]
  activelist
    .map((address) => memoryreadboard(address))
    .filter(isDefined)
    .forEach((board) => boardtick(os, MEMORY.book, board))
}
