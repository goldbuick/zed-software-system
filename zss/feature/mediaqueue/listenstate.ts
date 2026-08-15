import { ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'

let listenplayer = ''
let listenboardid = ''
let helperpeerid = ''
let listening = false
let helperconnected = false
let hasactiveroomstream = false

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
}

export function mediaqueuesetlistening(active: boolean) {
  listening = active
}

export function mediaqueuesethelperconnected(active: boolean) {
  helperconnected = active
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
