import { createdevice } from 'zss/device'
import { ispresent, isstring } from 'zss/mapping/types'

import { api_error, bip_rebootfailed, tape_info, vm_books } from './api'

function readstate(): string {
  try {
    const hash = window.location.hash.slice(1)
    if (hash.length) {
      return hash
    }
  } catch (err: any) {
    api_error('register', 'crash', err.message)
  }
  return ''
}

function writestate(exportedbooks: string) {
  const out = `#${exportedbooks}`
  if (window.location.hash !== out) {
    window.location.hash = out
    tape_info(
      register.name(),
      `wrote ${exportedbooks?.length ?? 0} chars [${exportedbooks.slice(0, 8)}...${exportedbooks.slice(-8)}]`,
    )
  }
}

const BIOS_BOOKS = 'bios-books'

function readbiosbooks(): string {
  return localStorage.getItem(BIOS_BOOKS) ?? ''
}

function writebiosbooks(books: string) {
  localStorage.setItem(BIOS_BOOKS, books)
}

function erasebiosbooks() {
  localStorage.removeItem(BIOS_BOOKS)
}

const register = createdevice('register', [], function (message) {
  switch (message.target) {
    // memory
    case 'reboot': {
      if (!ispresent(message.player)) {
        return
      }
      // check url first
      const books = readstate()
      if (books.length) {
        vm_books(register.name(), books, message.player)
        return
      }
      // check local storage second
      const biosbooks = readbiosbooks()
      if (biosbooks.length) {
        vm_books(register.name(), biosbooks, message.player)
        return
      }
      // signal error
      api_error(
        register.name(),
        message.target,
        'no main book found in registry',
        message.player,
      )
      bip_rebootfailed(register.name(), message.player)
      break
    }
    case 'flush':
      if (isstring(message.data)) {
        writestate(message.data)
      }
      break
    case 'biosflash':
      writebiosbooks(readstate())
      break
    case 'bioserase':
      erasebiosbooks()
      break
  }
})
