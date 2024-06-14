import { createdevice } from 'zss/device'
import { encodeduritovalue, valuetoencodeduri } from 'zss/mapping/buffer'
import { isarray, isbook, ispresent } from 'zss/mapping/types'

import { api_error, bip_rebootfailed, tape_info, vm_books } from './api'

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

const BIOS_BOOKS = 'bios-books'

function readbiosbooks(): STATE_BOOKS {
  const json = localStorage.getItem(BIOS_BOOKS)
  if (json === null) {
    return []
  }
  return JSON.parse(json) as STATE_BOOKS
}

function writebiosbooks(books: any) {
  localStorage.setItem(BIOS_BOOKS, JSON.stringify(books))
}

function erasebiosbooks() {
  localStorage.removeItem(BIOS_BOOKS)
}

const register = createdevice('register', [], (message) => {
  switch (message.target) {
    // memory
    case 'reboot':
      if (message.player) {
        // check url first
        const [, ...books] = readstate()
        if (isbook(books[0])) {
          vm_books(register.name(), books, message.player)
        } else {
          // check local storage second
          const biosbooks = readbiosbooks()
          if (biosbooks.length > 0 && biosbooks.every(isbook)) {
            vm_books(register.name(), biosbooks, message.player)
          } else {
            api_error(
              register.name(),
              message.target,
              'no main book found in registry',
              message.player,
            )
            bip_rebootfailed(register.name(), message.player)
          }
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
    case 'biosflash': {
      const [, ...books] = readstate()
      writebiosbooks(books)
      break
    }
    case 'bioserase': {
      erasebiosbooks()
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
