import { createdevice } from 'zss/device'
import { encodeduritovalue, valuetoencodeduri } from 'zss/mapping/buffer'
import { ispresent } from 'zss/mapping/types'

import { vm_mem } from './api'

function readstate(): [any, any] {
  try {
    const hash = window.location.hash.slice(1)
    if (hash.length) {
      return encodeduritovalue(hash)
    }
  } catch (err) {
    //
  }
  // state is [memory, flags]
  return [{}, {}] as any
}

function writestate(state: any) {
  const out = `#${valuetoencodeduri(state)}`
  window.location.hash = out
}

const register = createdevice('register', [], (message) => {
  switch (message.target) {
    // memory
    case 'reboot': {
      const [mem] = readstate()
      if (ispresent(mem)) {
        vm_mem(register.id(), mem)
      }
      break
    }
    case 'flush': {
      const [, flags] = readstate()
      if (ispresent(message.data)) {
        writestate([message.data, flags])
      }
      break
    }
    // flags
    case 'read': {
      const [name] = message.data
      const [, flags] = readstate()
      if (ispresent(flags)) {
        const value = flags[name]
        if (ispresent(flags)) {
          register.reply(message, 'register', [name, value])
          console.info('read', value, 'for', name)
        } else {
          console.info(name, 'is empty')
        }
      }
      break
    }
    case 'write': {
      const [name, value] = message.data
      const [mem, flags] = readstate()
      if (ispresent(flags)) {
        flags[name] = value
        writestate([mem, flags])
        console.info('wrote', value, 'to', name)
      }
      break
    }
  }
})
