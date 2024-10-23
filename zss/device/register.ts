import localforage from 'localforage'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring } from 'zss/mapping/types'

import {
  api_error,
  tape_crash,
  tape_info,
  tape_terminal_close,
  vm_books,
  vm_doot,
  vm_init,
  vm_login,
} from './api'
import { gadgetstategetplayer, gadgetstatesetplayer } from './gadgetclient'

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

const BIOS_NODE = 'bios-node'

async function readbiosnode(defaultnode: string) {
  try {
    const node = await localforage.getItem<string>(BIOS_NODE)
    if (ispresent(node)) {
      return node
    }
    return await localforage.setItem(BIOS_NODE, defaultnode)
  } catch (err: any) {
    api_error(register.name(), BIOS_NODE, err.message)
  }
}

async function erasebiosnode() {
  try {
    await localforage.removeItem(BIOS_NODE)
  } catch (err: any) {
    api_error(register.name(), BIOS_NODE, err.message)
  }
}

const BIOS_BOOKS = 'bios-books'

async function readbiosbooks() {
  try {
    const books = await localforage.getItem<string>(BIOS_BOOKS)
    if (ispresent(books)) {
      return books
    }
  } catch (err: any) {
    api_error(register.name(), BIOS_BOOKS, err.message)
  }
}

async function writebiosbooks() {
  try {
    const source = readstate()
    if (source.length) {
      await localforage.setItem<string>(BIOS_BOOKS, source)
    }
  } catch (err: any) {
    api_error(register.name(), BIOS_BOOKS, err.message)
  }
}

async function erasebiosbooks() {
  try {
    await localforage.removeItem(BIOS_BOOKS)
  } catch (err: any) {
    api_error(register.name(), BIOS_BOOKS, err.message)
  }
}

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 24 seconds
const signalrate = 1

const register = createdevice(
  'register',
  ['second', 'ready', 'error'],
  function (message) {
    switch (message.target) {
      case 'error:login:main':
      case 'error:login:title':
      case 'error:login:player':
        tape_crash(register.name())
        break
      case 'ready':
        doasync('register:ready', async () => {
          if (!ispresent(message.player)) {
            return
          }
          const player = await readbiosnode(message.player)
          if (!ispresent(player)) {
            return
          }
          // init vm with player id
          if (gadgetstatesetplayer(player)) {
            vm_init(register.name(), player)
          }
        })
        break
      case 'ackinit':
        doasync('register:ackinit', async () => {
          if (!ispresent(message.player)) {
            return
          }
          const books = readstate() ?? (await readbiosbooks())
          if (books.length === 0) {
            api_error(register.name(), 'content', 'no content found')
            tape_crash(register.name())
            return
          }
          // init vm with content
          vm_books(register.name(), books, message.player)
        })
        break
      case 'ackbooks':
        if (ispresent(message.player)) {
          vm_login(register.name(), message.player)
        }
        break
      case 'acklogin':
        tape_terminal_close(register.name())
        break
      case 'flush':
        if (isstring(message.data)) {
          writestate(message.data)
        }
        break
      case 'nodetrash':
        doasync('register:nodetrash', async () => await erasebiosnode())
        break
      case 'biosflash':
        doasync('register:biosflash', async () => await writebiosbooks())
        break
      case 'biostrash':
        doasync('register:biostrash', async () => await erasebiosbooks())
        break
      case 'second':
        ++keepalive
        if (keepalive >= signalrate) {
          keepalive -= signalrate
          const player = gadgetstategetplayer()
          if (player) {
            vm_doot(register.name(), player)
          }
        }
        break
    }
  },
)
