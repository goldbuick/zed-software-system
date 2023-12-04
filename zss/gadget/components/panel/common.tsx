import { createContext } from 'react'
import { WORD_VALUE } from 'zss/system/chip'

import { WRITE_TEXT_CONTEXT } from '../../data/textFormat'

export interface PanelItemProps {
  player: string
  chip: string
  active: boolean
  label: string
  args: WORD_VALUE[]
  context: WRITE_TEXT_CONTEXT
}

type ScrollContextState = {
  sendmessage: (target: string) => void
  sendclose: () => void
  didclose: () => void
}

export const ScrollContext = createContext<ScrollContextState>({
  sendmessage() {},
  sendclose() {},
  didclose() {},
})

export const PlayerContext = createContext('')

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

export function addSelfId(id: string, target: string) {
  // always prefix with route back to this chip
  return `platform:${id}:${target}`
}
