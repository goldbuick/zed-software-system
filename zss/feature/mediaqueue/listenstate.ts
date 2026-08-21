import { ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'

let listenplayer = ''
/** board id -> helper peer id */
const boardhelpers = new Map<string, string>()
/** helper peer ids with an open DataConnection */
const connectedhelpers = new Set<string>()
let hasactiveroomstream = false
let boardtvgateepoch = 0
const boardtvgatesubs = new Set<() => void>()

function bumpboardtvgate() {
  boardtvgateepoch += 1
  for (const sub of boardtvgatesubs) {
    sub()
  }
}

export function mediaqueuesubscribeboardtvgate(onstorechange: () => void) {
  boardtvgatesubs.add(onstorechange)
  return () => {
    boardtvgatesubs.delete(onstorechange)
  }
}

export function mediaqueuereadboardtvgatesnapshot() {
  return boardtvgateepoch
}

/** Notify board TV subscribers (player layer / connect state on join tabs). */
export function mediaqueuenotifyboardtvgate() {
  bumpboardtvgate()
}

export function mediaqueuereadlistenplayer(): string {
  return listenplayer
}

export function mediaqueuesetlistenplayer(player: string) {
  listenplayer = player
}

export function mediaqueuereadboundboardids(): string[] {
  return Array.from(boardhelpers.keys())
}

export function mediaqueueisboundboard(boardid: string): boolean {
  const trimmed = boardid.trim()
  return trimmed !== '' && boardhelpers.has(trimmed)
}

export function mediaqueuereadhelperforboard(boardid: string): string {
  const trimmed = boardid.trim()
  if (!trimmed) {
    return ''
  }
  return boardhelpers.get(trimmed) ?? ''
}

export function mediaqueuereadboardsforhelper(peerid: string): string[] {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return []
  }
  const boards: string[] = []
  for (const [boardid, helper] of boardhelpers) {
    if (helper === trimmed) {
      boards.push(boardid)
    }
  }
  return boards
}

export function mediaqueuesetboardhelper(boardid: string, peerid: string) {
  const board = boardid.trim()
  const helper = peerid.trim()
  if (!board || !helper) {
    return
  }
  boardhelpers.set(board, helper)
  bumpboardtvgate()
}

/** Returns the helper peer id that was bound, if any. */
export function mediaqueueclearboardhelper(boardid: string): string {
  const board = boardid.trim()
  if (!board) {
    return ''
  }
  const previous = boardhelpers.get(board) ?? ''
  boardhelpers.delete(board)
  bumpboardtvgate()
  return previous
}

export function mediaqueuehasanybind(): boolean {
  return boardhelpers.size > 0
}

export function mediaqueueclearlistenstate() {
  boardhelpers.clear()
  connectedhelpers.clear()
  listenplayer = ''
  hasactiveroomstream = false
  bumpboardtvgate()
}

export function mediaqueuesethelperconnected(peerid: string, active: boolean) {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return
  }
  if (active) {
    connectedhelpers.add(trimmed)
  } else {
    connectedhelpers.delete(trimmed)
  }
  bumpboardtvgate()
}

export function mediaqueuehelperconnected(peerid?: string): boolean {
  const trimmed = (peerid ?? '').trim()
  if (trimmed) {
    return connectedhelpers.has(trimmed)
  }
  return connectedhelpers.size > 0
}

export function mediaqueuesethasactiveroomstream(active: boolean) {
  hasactiveroomstream = active
}

export function mediaqueuereadboundboardlabel(boardid: string): string {
  const board = memoryreadboardbyaddress(boardid)
  if (!ispresent(board)) {
    return boardid || '?'
  }
  return board.name || board.id
}

export function mediaqueueislistening(): boolean {
  return boardhelpers.size > 0
}

export function mediaqueuehasactivestream(): boolean {
  return hasactiveroomstream
}

export function mediaqueueislistenhost(player: string): boolean {
  return Boolean(listenplayer && listenplayer === player && boardhelpers.size > 0)
}
