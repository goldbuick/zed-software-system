import { createdevice } from 'zss/device'
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

function readbiosnode(defaultnode: string) {
  try {
    const node = localStorage.getItem(BIOS_NODE)
    if (ispresent(node)) {
      return node
    }
    localStorage.setItem(BIOS_NODE, defaultnode)
    return defaultnode
  } catch (err: any) {
    api_error(register.name(), BIOS_NODE, err.message)
  }
}

function erasebiosnode() {
  localStorage.removeItem(BIOS_NODE)
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
      case 'ready': {
        if (!ispresent(message.player)) {
          return
        }
        const player = readbiosnode(message.player)
        if (!ispresent(player)) {
          return
        }
        // init vm with player id
        if (gadgetstatesetplayer(player)) {
          vm_init(register.name(), player)
        }
        break
      }
      case 'ackinit': {
        if (!ispresent(message.player)) {
          return
        }
        const books = readstate()
        if (books.length === 0) {
          api_error(register.name(), 'content', 'no content found')
          tape_crash(register.name())
          return
        }
        // init vm with content
        vm_books(register.name(), books, message.player)
        break
      }
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
        erasebiosnode()
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
