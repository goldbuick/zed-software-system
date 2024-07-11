import { createdevice } from 'zss/device'
import { decompressfromurlhash, compresstourlhash } from 'zss/mapping/buffer'
import { doasync } from 'zss/mapping/func'
import { isarray, isbook, ispresent } from 'zss/mapping/types'
import { bookexport, shapebook } from 'zss/memory/book'

import { api_error, bip_rebootfailed, tape_info, vm_books } from './api'

type STATE_BOOKS = any[]

async function readstate(): Promise<STATE_BOOKS> {
  try {
    const hash = window.location.hash.slice(1)
    if (hash.length) {
      const result = (await decompressfromurlhash(hash)) ?? []
      return result.map(shapebook)
    }
  } catch (err) {
    //
  }
  return [] as any[]
}

async function writestate(books: STATE_BOOKS) {
  const cleanbooks = [...books.map(bookexport)].filter(ispresent)
  const hash = (await compresstourlhash(cleanbooks)) ?? ''
  const out = `#${hash}`
  window.location.hash = out
  tape_info(
    register.name(),
    `wrote ${hash?.length ?? 0} chars [${hash.slice(0, 8)}...${hash.slice(-8)}]`,
  )
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

const register = createdevice('register', [], function (message) {
  switch (message.target) {
    // memory
    case 'reboot':
      doasync(async function () {
        if (!ispresent(message.player)) {
          return
        }

        // check url first
        const books = await readstate()
        if (isbook(books[0])) {
          vm_books(register.name(), books, message.player)
          return
        }

        // check local storage second
        const biosbooks = readbiosbooks()
        if (biosbooks.length > 0 && biosbooks.every(isbook)) {
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
      })
      break
    case 'flush':
      doasync(async function () {
        if (isarray(message.data)) {
          await writestate(message.data)
        }
      })
      break
    case 'biosflash':
      doasync(async function () {
        const books = await readstate()
        writebiosbooks(books)
      })
      break
    case 'bioserase':
      erasebiosbooks()
      break
  }
})
