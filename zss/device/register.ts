import { shortenUrl } from 'shaveurl'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { ispresent, isstring } from 'zss/mapping/types'
import { writecopyit, writeheader, writeoption } from 'zss/words/writeui'

import {
  api_error,
  gadgetserver_desync,
  tape_crash,
  tape_info,
  tape_terminal_close,
  vm_books,
  vm_doot,
  vm_init,
  vm_login,
} from './api'

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

const BIOS_SELECT = 'bios-select'

function readbiosselect() {
  try {
    return localStorage.getItem(BIOS_SELECT) ?? ''
  } catch (err: any) {
    api_error(register.name(), BIOS_SELECT, err.message)
  }
  return ''
}

function writebiosselect(select: string) {
  try {
    localStorage.setItem(BIOS_SELECT, select)
  } catch (err: any) {
    api_error(register.name(), BIOS_SELECT, err.message)
  }
}

// softwareasmain

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 24 seconds
const signalrate = 1

const register = createdevice(
  'register',
  ['second', 'ready', 'error'],
  function (message) {
    const gadgetclient = useGadgetClient.getState()
    switch (message.target) {
      case 'error:login:main':
      case 'error:login:title':
      case 'error:login:player':
        tape_crash(register.name())
        break
      case 'fullscreen':
        doasync('register:fullscreen', async function () {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen()
          } else if (document.exitFullscreen) {
            await document.exitFullscreen()
          }
        })
        break
      case 'share':
        doasync('register:share', async function () {
          const shorturl = await shortenUrl(window.location.href)
          writecopyit('share', shorturl, shorturl)
        })
        break
      case 'refresh':
        doasync('register:refresh', async function () {
          writeheader(register.name(), 'BYE')
          await waitfor(100)
          window.location.reload()
        })
        break
      case 'nuke':
        doasync('register:nuke', async function () {
          writeheader(register.name(), 'nuke in')
          writeoption(register.name(), '3', '...')
          await waitfor(1000)
          writeoption(register.name(), '2', '...')
          await waitfor(1000)
          writeoption(register.name(), '1', '...')
          await waitfor(1000)
          writeheader(register.name(), 'BYE')
          await waitfor(100)
          window.location.hash = ''
          window.location.reload()
        })
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
        if (!gadgetclient.gadget.player) {
          // track player id
          useGadgetClient.setState((state) => {
            return {
              ...state,
              gadget: {
                ...state.gadget,
                player,
              },
            }
          })
          // signal init
          setTimeout(() => vm_init('register', player), 256)
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
        vm_books(register.name(), books, readbiosselect(), message.player)
        break
      }
      case 'ackbooks':
        if (ispresent(message.player)) {
          vm_login(register.name(), message.player)
        }
        break
      case 'acklogin':
        if (ispresent(message.player)) {
          const { player } = message
          tape_terminal_close(register.name())
          setTimeout(() => gadgetserver_desync(register.name(), player), 1000)
        }
        break
      case 'flush':
        if (isstring(message.data)) {
          writestate(message.data)
        }
        break
      case 'select':
        if (isstring(message.data)) {
          writebiosselect(message.data)
        }
        break
      case 'nodetrash':
        erasebiosnode()
        break
      case 'second':
        ++keepalive
        if (keepalive >= signalrate) {
          keepalive -= signalrate
          if (gadgetclient.gadget.player) {
            vm_doot(register.name(), gadgetclient.gadget.player)
          }
        }
        break
    }
  },
)
