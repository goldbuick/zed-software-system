import { proxy, useSnapshot } from 'valtio'
import { createdevice } from 'zss/device'
import { createguid } from 'zss/mapping/guid'

// system wide message logger

type TAPE_ROW = [string, string, string, ...any[]]
const tape = proxy({
  open: false,
  logs: [] as TAPE_ROW[],
})

export function tapesetopen(open: boolean) {
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
  }
})
