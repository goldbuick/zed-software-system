import { proxy, useSnapshot } from 'valtio'
import { createdevice } from 'zss/device'

// system wide message logger

const tape = proxy([] as any[][])

export function useTape() {
  return useSnapshot(tape)
}

createdevice('tape', ['log', 'error'], (message) => {
  switch (message.target) {
    case 'log':
    case 'error':
      tape.push([message.target, message.sender, ...message.data])
      break
  }
})
