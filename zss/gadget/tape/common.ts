import { SyncedText } from '@syncedstore/core'
import { createContext } from 'react'
import { MODEM_SHARED_VALUE } from 'zss/device/modem'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { WRITE_TEXT_CONTEXT, textformatreadedges } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

// deco
export const BKG_PTRN = 250
export const BKG_PTRN_ALT = 249

// colors
export const FG = COLOR.BLUE
export const FG_SELECTED = COLOR.WHITE
export const BG_SELECTED = COLOR.DKGRAY
export const BG_ACTIVE = COLOR.BLACK

export function bgcolor(quickterminal: boolean) {
  return quickterminal ? COLOR.ONCLEAR : COLOR.DKBLUE
}

export type TapeTerminalItemProps = {
  blink?: boolean
  active?: boolean
  text: string
  y: number
}

export type TapeTerminalItemInputProps = {
  blink?: boolean
  active?: boolean
  prefix: string
  label: string
  words: string[]
  y: number
}

type TapeTerminalContextState = {
  sendmessage: (target: string, data?: any) => void
}

export const TapeTerminalContext = createContext<TapeTerminalContextState>({
  sendmessage() {},
})

export function logitemy(offset: number, context: WRITE_TEXT_CONTEXT) {
  return context.height - 3 + offset
}

export function setuplogitem(
  blink: boolean,
  active: boolean,
  x: number,
  y: number,
  context: WRITE_TEXT_CONTEXT,
) {
  const edge = textformatreadedges(context)
  // reset context
  context.iseven = context.y % 2 === 0
  context.active.bg = active && !blink ? BG_ACTIVE : context.reset.bg
  context.active.leftedge = edge.left
  context.active.rightedge = edge.right
  context.active.topedge = edge.top
  context.active.bottomedge = edge.bottom
  context.x = context.active.leftedge + x
  context.y = context.active.topedge + y
}

export function setupeditoritem(
  blink: boolean,
  active: boolean,
  x: number,
  y: number,
  context: WRITE_TEXT_CONTEXT,
  xmargin: number,
  topmargin: number,
  bottommargin: number,
) {
  const edge = textformatreadedges(context)
  // reset context
  context.iseven = context.y % 2 === 0
  context.active.color = COLOR.WHITE
  context.active.bg = active && !blink ? BG_ACTIVE : context.reset.bg
  context.active.leftedge = edge.left + xmargin
  context.active.rightedge = edge.right - xmargin
  context.active.topedge = edge.top + topmargin
  context.active.bottomedge = edge.bottom - bottommargin
  context.x = context.active.leftedge + x
  context.y = context.active.topedge + y
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

export function findmaxwidthinrows(rows: EDITOR_CODE_ROW[]): number {
  return rows.reduce((maxwidth, row) => {
    const width = row.code.length
    return width > maxwidth ? width : maxwidth
  }, 0)
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
