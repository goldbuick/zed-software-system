import { proxy, useSnapshot } from 'valtio'
import { createdevice } from 'zss/device'
import { createguid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { isnumber } from 'zss/mapping/types'

// system wide message logger

export enum TAPE_DISPLAY {
  BOTTOM,
  RIGHT,
  TOP,
  LEFT,
  FULL,
  MAX,
}

type TAPE_ROW = [string, string, string, ...any[]]

type TAPE_STATE = {
  open: boolean
  mode: TAPE_DISPLAY
  logs: TAPE_ROW[]
}

const tape: TAPE_STATE = proxy({
  open: false,
  mode: TAPE_DISPLAY.BOTTOM,
  logs: [],
})

export function tapesetopen(open: boolean) {
  tape.open = open
}

export function tapesetmode(inc: number) {
  tape.mode = ((tape.mode as number) + inc) as TAPE_DISPLAY
  if ((tape.mode as number) < 0) {
    tape.mode += TAPE_DISPLAY.MAX
  }
  if ((tape.mode as number) >= (TAPE_DISPLAY.MAX as number)) {
    tape.mode -= TAPE_DISPLAY.MAX
  }
}

export function useTape() {
  return useSnapshot(tape)
}

createdevice('tape', [], (message) => {
  switch (message.target) {
    case 'log':
    case 'error': {
      tape.logs.unshift([
        createguid(),
        message.target,
        message.sender,
        ...message.data,
      ])
      break
    }
    case 'open':
      if (isnumber(message.data)) {
        tapesetopen(true)
        tapesetmode(message.data)
      }
      break
  }
})
