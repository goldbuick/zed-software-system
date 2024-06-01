import { createContext } from 'react'
import { proxy } from 'valtio'
import { WRITE_TEXT_CONTEXT } from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import { MAYBE_NUMBER } from 'zss/mapping/types'

export const SCALE = 1
export const FG = COLOR.BLUE
export const BG = COLOR.DKBLUE
export const BG_ACTIVE = COLOR.BLACK
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

export type ConsoleItemProps = {
  blink?: boolean
  active?: boolean
  text: string
  offset: number
  context: WRITE_TEXT_CONTEXT
}

export type ConsoleItemInputProps = {
  blink?: boolean
  active?: boolean
  prefix: string
  label: string
  words: string[]
  offset: number
  context: WRITE_TEXT_CONTEXT
}

type ConsoleContextState = {
  sendmessage: (target: string, data?: any) => void
}

export const ConsoleContext = createContext<ConsoleContextState>({
  sendmessage() {},
})

export function setupitemcontext(
  blink: boolean,
  active: boolean,
  offset: number,
  context: WRITE_TEXT_CONTEXT,
) {
  context.y = context.height - 3 + offset
  context.isEven = context.y % 2 === 0
  context.activeBg = active && !blink ? BG_ACTIVE : BG
}
