import { createContext } from 'react'
import { proxy, useSnapshot } from 'valtio'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import { MAYBE_NUMBER } from 'zss/mapping/types'

// deco
export const DOT = 250

// edges
export const EG_TOP = `$196`
export const EG_BOTTOM = `$205`

// colors
export const FG = COLOR.BLUE
export const BG = COLOR.DKBLUE
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

export function setuplogitem(
  blink: boolean,
  active: boolean,
  offset: number,
  context: WRITE_TEXT_CONTEXT,
) {
  // reset context
  context.y = context.height - 3 + offset
  context.isEven = context.y % 2 === 0
  context.activeBg = active && !blink ? BG_ACTIVE : BG

  // write bkg dots
  const p1 = context.y * context.width
  const p2 = p1 + context.width - 1
  applystrtoindex(
    context.y * context.width,
    String.fromCharCode(DOT).repeat(context.width),
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
  context: WRITE_TEXT_CONTEXT,
) {
  // reset context
  context.x = x
  context.y = y
  context.isEven = context.y % 2 === 0
  context.activeBg = active && !blink ? BG_ACTIVE : BG
}
