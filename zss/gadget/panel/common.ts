import { createContext } from 'react'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { WORD } from 'zss/words/types'

export type PanelItemProps = {
  player: string
  chip: string
  row?: number
  active: boolean
  label: string
  args: WORD[]
  context: WRITE_TEXT_CONTEXT
}

type ScrollContextState = {
  sendmessage: (target: string, data?: any) => void
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

export function mapToString(arg: any, defaultvalue: string) {
  if (typeof arg === 'string') {
    return arg
  }
  return defaultvalue
}

export function mapToNumber(arg: any, defaultvalue: number) {
  if (typeof arg === 'number') {
    return arg
  }
  return defaultvalue
}

export function mapTo<T>(arg: any, defaultvalue: T): T {
  if (typeof arg === typeof defaultvalue) {
    return arg
  }
  return defaultvalue
}

export function chiptarget(chip: string, target: string) {
  switch (chip) {
    case 'touchkey':
      return `register:${chip}:${target}`
  }
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

export function setuppanelitem(y: MAYBE<number>, context: WRITE_TEXT_CONTEXT) {
  if (ispresent(y)) {
    context.x = 1
    context.y = y
  }
}
