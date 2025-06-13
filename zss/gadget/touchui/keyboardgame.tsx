import { deepcopy } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { useDeviceConfig } from '../hooks'

import { LIST_LEFT } from './common'
import { NumKey } from './numkey'
import { ToggleKey } from './togglekey'
import { WordPlane } from './wordplane'

type KeyboardGameProps = {
  width: number
}

export function KeyboardGame({ width }: KeyboardGameProps) {
  // const { keyboardshift, wordlist } = useDeviceConfig()
  // const left = width - 19
  // const mid = width - 13
  // const right = width - 7
  // const corner: PT = { x: LIST_LEFT, y: 0 }
  return <></>
}
