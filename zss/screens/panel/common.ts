import { createContext } from 'react'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { WORD } from 'zss/words/types'

export type PanelItemProps = {
  sidebar: boolean
  player: string
  chip: string
  row?: number
  active: boolean
  label: string
  args: WORD[]
  context: WRITE_TEXT_CONTEXT
}

type ScrollContextState = {
  sendmessage: (target: string, data: any[]) => void
  sendclose: () => void
  didclose: () => void
}

export const ScrollContext = createContext<ScrollContextState>({
  sendmessage() {},
  sendclose() {},
  didclose() {},
})

export const theme = {
  input: {
    color: '$white',
    active: '$yellow',
  },
}

export function inputcolor(active: boolean) {
  return active ? theme.input.active : theme.input.color
}

export function chiptarget(chip: string, target: string) {
  // always prefix with route back to this chip
  return `vm:${chip}:${target}`
}

export function strsplice(
  source: string,
  index: number,
  removecount = 0,
  insert = '',
) {
  return `${source.substring(0, index)}${insert}${source.substring(
    index + removecount,
  )}`
}

export function setuppanelitem(
  sidebar: boolean,
  y: MAYBE<number>,
  context: WRITE_TEXT_CONTEXT,
) {
  if (ispresent(y)) {
    context.x = sidebar ? 1 : 0
    context.y = y
    context.disablewrap = true
  }
}
