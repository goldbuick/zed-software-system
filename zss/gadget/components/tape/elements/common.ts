import { SyncedText } from '@syncedstore/core'
import { createContext } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { MODEM_SHARED_VALUE } from 'zss/device/modem'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import { MAYBE, MAYBE_NUMBER, ispresent } from 'zss/mapping/types'

// deco
export const BKG_PTRN = 250

// colors
export const FG = COLOR.BLUE
export const FG_SELECTED = COLOR.WHITE
export const BG = COLOR.DKBLUE
export const BG_SELECTED = COLOR.DKGRAY
export const BG_ACTIVE = COLOR.BLACK

// sizing
export const SCALE = 1
export const CHAR_WIDTH = DRAW_CHAR_WIDTH * SCALE
export const CHAR_HEIGHT = DRAW_CHAR_HEIGHT * SCALE

export const tapeinputstate = proxy({
  // cursor position & selection
  xcursor: 0,
  ycursor: 0,
  xselect: undefined as MAYBE_NUMBER,
  yselect: undefined as MAYBE_NUMBER,
  // input history
  bufferindex: 0,
  buffer: [''],
})
export function useTapeInput() {
  return useSnapshot(tapeinputstate)
}

export const tapeeditorstate = proxy({
  // need an id for synced store
  id: '',
  // cursor position & selection (text index)
  cursor: 0,
  select: undefined as MAYBE_NUMBER,
})
export function useTapeEditor() {
  return useSnapshot(tapeeditorstate)
}

export type ConsoleItemProps = {
  blink?: boolean
  active?: boolean
  text: string
  offset: number
}

export type ConsoleItemInputProps = {
  blink?: boolean
  active?: boolean
  prefix: string
  label: string
  words: string[]
  offset: number
}

type ConsoleContextState = {
  sendmessage: (target: string, data?: any) => void
}

export const ConsoleContext = createContext<ConsoleContextState>({
  sendmessage() {},
})

export function logitemy(offset: number, context: WRITE_TEXT_CONTEXT) {
  return context.height - 3 + offset
}

export function setuplogitem(
  blink: boolean,
  active: boolean,
  offset: number,
  context: WRITE_TEXT_CONTEXT,
) {
  // reset context
  context.x = context.active.leftedge ?? 0
  context.y = logitemy(offset, context)
  context.iseven = context.y % 2 === 0
  context.active.bg = active && !blink ? BG_ACTIVE : BG

  // write bkg dots
  const p1 = context.y * context.width
  const p2 = p1 + context.width - 1
  applystrtoindex(
    context.y * context.width,
    String.fromCharCode(BKG_PTRN).repeat(context.width),
    context,
  )
  // write default colors
  applycolortoindexes(p1, p2, FG, BG, context)
}

export function setupeditoritem(
  blink: boolean,
  active: boolean,
  x: number,
  y: number,
  inset: number,
  context: WRITE_TEXT_CONTEXT,
) {
  // reset context
  context.x = x
  context.y = y
  context.iseven = context.y % 2 === 0
  context.active.bg = active && !blink ? BG_ACTIVE : BG
  context.active.leftedge = inset
  context.active.rightedge = context.width - 1 - inset
  context.active.topedge = inset
  context.active.bottomedge = context.height - 1 - inset
}

export type EDITOR_CODE_ROW = {
  start: number
  code: string
  end: number
}

export function splitcoderows(code: string): EDITOR_CODE_ROW[] {
  let cursor = 0
  const rows = code.split(/\r?\n/)
  return rows.map((code) => {
    const start = cursor
    const fullcode = `${code}\n`
    cursor += fullcode.length
    return {
      start,
      code: fullcode,
      end: start + code.length,
    }
  })
}

export function findcursorinrows(cursor: number, rows: EDITOR_CODE_ROW[]) {
  for (let i = 0; i < rows.length; ++i) {
    if (cursor <= rows[i].end) {
      return i
    }
  }
  return 0
}

export function sharedtosynced(
  shared: MAYBE<MODEM_SHARED_VALUE>,
): MAYBE<SyncedText> {
  return ispresent(shared) ? (shared.value as SyncedText) : undefined
}

export function sharedtorows(shared: MAYBE<MODEM_SHARED_VALUE>) {
  const value = sharedtosynced(shared)
  return splitcoderows(ispresent(value) ? value.toJSON() : '')
}
