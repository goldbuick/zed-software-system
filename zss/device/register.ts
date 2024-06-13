import { createdevice } from 'zss/device'
import { encodeduritovalue, valuetoencodeduri } from 'zss/mapping/buffer'
import { isarray, ispresent } from 'zss/mapping/types'
import { isbook } from 'zss/memory/book'

import { api_error, bip_rebootfailed, tape_info, vm_mem } from './api'

type STATE_FLAGS = Record<string, any>
type STATE_BOOKS = any[]

function readstate(): [STATE_FLAGS, ...STATE_BOOKS] {
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

function writestate(flags: STATE_FLAGS, books: STATE_BOOKS) {
  const out = `#${valuetoencodeduri([flags, ...books])}`
  window.location.hash = out
}

const register = createdevice('register', [], (message) => {
  switch (message.target) {
    // memory
    case 'reboot':
      if (message.player) {
        const [, main] = readstate()
        if (isbook(main)) {
          tape_info(
            register.name(),
            'loaded main from registry',
            message.player,
          )
          vm_mem(register.name(), main, message.player)
        } else {
          api_error(
            register.name(),
            'reboot',
            'no book found in registry',
            message.player,
          )
          bip_rebootfailed(register.name(), message.player)
        }
      }
      break
    case 'flush': {
      const [flags] = readstate()
      if (isarray(message.data)) {
        writestate(flags, message.data)
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
      const [flags, ...books] = readstate()
      if (ispresent(flags)) {
        flags[name] = value
        writestate(flags, books)
        tape_info(register.name(), 'wrote', value, 'to', name)
      }
      break
    }
  }
})
