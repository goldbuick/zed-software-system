import { createContext } from 'react'
import { WRITE_TEXT_CONTEXT } from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'

export const SCALE = 1
export const FG = COLOR.BLUE
export const BG = COLOR.DKBLUE
export const CHAR_WIDTH = DRAW_CHAR_WIDTH * SCALE
export const CHAR_HEIGHT = DRAW_CHAR_HEIGHT * SCALE

export type ConsoleItemProps = {
  player: string
  chip: string
  active: boolean
  // ?? just text ??
  // label: string
  // args: WORD_VALUE[]
  context: WRITE_TEXT_CONTEXT
}

type ConsoleContextState = {
  sendmessage: (target: string, data?: any) => void
  sendclose: () => void
  didclose: () => void
}

export const ConsoleContext = createContext<ConsoleContextState>({
  sendmessage() {},
  sendclose() {},
  didclose() {},
})
