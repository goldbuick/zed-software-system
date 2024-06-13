import { createdevice } from 'zss/device'
import { encodeduritovalue, valuetoencodeduri } from 'zss/mapping/buffer'
import { ispresent } from 'zss/mapping/types'
import { isbook } from 'zss/memory/book'

import { api_error, tape_info, vm_mem } from './api'

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
    case 'reboot':
      if (message.player) {
        const [, main] = readstate()
        if (isbook(main)) {
          vm_mem(register.name(), main, message.player)
          api_error(
            register.name(),
            'reboot',
            'loaded main from registry',
            message.player,
          )
        } else {
          api_error(
            register.name(),
            'reboot',
            'no book found in registry',
            message.player,
          )
        }
      }
      break
    case 'flush': {
      const [flags] = readstate()
      if (ispresent(message.data)) {
        writestate([message.data, flags])
      }
      break
    }
    // flags
    case 'read': {
      const [name] = message.data
      const [flags] = readstate()
      if (ispresent(flags)) {
        const value = flags[name]
        if (ispresent(flags)) {
          register.reply(message, 'register', [name, value])
          tape_info(register.name(), 'read', value, 'for', name)
        } else {
          tape_info(register.name(), 'read', name, 'is empty')
        }
      }
      break
    }
    case 'write': {
      const [name, value] = message.data
      const [flags, main] = readstate()
      if (ispresent(flags)) {
        flags[name] = value
        writestate([flags, main])
        tape_info(register.name(), 'wrote', value, 'to', name)
      }
      break
    }
  }
})
