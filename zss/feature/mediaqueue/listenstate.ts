import { ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'

let listenplayer = ''
let listenboardid = ''
let helperpeerid = ''
let listening = false
let helperconnected = false
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

export function mediaqueuereadboundboardid(): string {
  return listenboardid
}

export function mediaqueuesetlistenboardid(boardid: string) {
  listenboardid = boardid
  bumpboardtvgate()
}

export function mediaqueuereadhelperpeerid(): string {
  return helperpeerid
}

export function mediaqueuesethelperpeerid(peerid: string) {
  helperpeerid = peerid
}

export function mediaqueueclearlistenstate() {
  helperpeerid = ''
  listenboardid = ''
  listening = false
  helperconnected = false
  hasactiveroomstream = false
  bumpboardtvgate()
}

export function mediaqueuesetlistening(active: boolean) {
  listening = active
  bumpboardtvgate()
}

export function mediaqueuesethelperconnected(active: boolean) {
  helperconnected = active
  bumpboardtvgate()
}

export function mediaqueuesethasactiveroomstream(active: boolean) {
  hasactiveroomstream = active
}

export function mediaqueuereadpeerid(): string | undefined {
  const trimmed = helperpeerid.trim()
  if (trimmed) {
    return trimmed
  }
  return undefined
}

export function mediaqueuereadboundboardlabel(boardid: string): string {
  const board = memoryreadboardbyaddress(boardid)
  if (!ispresent(board)) {
    return boardid || '?'
  }
  return board.name || board.id
}

export function mediaqueueislistening(): boolean {
  return listening
}

export function mediaqueuehelperconnected(): boolean {
  return helperconnected
}

export function mediaqueuehasactivestream(): boolean {
  return hasactiveroomstream
}

export function mediaqueueislistenhost(player: string): boolean {
  return Boolean(listenplayer && listenplayer === player && listening)
}
