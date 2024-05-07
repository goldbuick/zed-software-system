import { proxy, useSnapshot } from 'valtio'
import { createdevice } from 'zss/device'
import { createguid } from 'zss/mapping/guid'
import { isnumber } from 'zss/mapping/types'

// system wide message logger

type TAPE_ROW = [string, string, string, ...any[]]
const tape = proxy({
  open: 0,
  logs: [] as TAPE_ROW[],
})

export function tapesetopen(open: number) {
  tape.open = open
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
        tapesetopen(message.data)
      }
      break
  }
})
