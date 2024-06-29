import { createdevice } from 'zss/device'
import { encodeduritovalue, valuetoencodeduri } from 'zss/mapping/buffer'
import { isarray, isbook } from 'zss/mapping/types'
import { bookexport } from 'zss/memory/book'

import { api_error, bip_rebootfailed, tape_info, vm_books } from './api'

type STATE_BOOKS = any[]

function readstate(): STATE_BOOKS {
  try {
    const hash = window.location.hash.slice(1)
    if (hash.length) {
      return encodeduritovalue(hash)
    }
  } catch (err) {
    //
  }
  return [] as any[]
}

function writestate(books: STATE_BOOKS) {
  const cleanbooks = [...books.map(bookexport)]
  const out = `#${valuetoencodeduri(cleanbooks)}`
  window.location.hash = out
  tape_info(register.name(), `wrote [...${out.slice(-16)}]`)
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
        const books = readstate()
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
      if (isarray(message.data)) {
        writestate(message.data)
      }
      break
    }
    case 'biosflash': {
      const books = readstate()
      writebiosbooks(books)
      break
    }
    case 'bioserase': {
      erasebiosbooks()
      break
    }
  }
})
