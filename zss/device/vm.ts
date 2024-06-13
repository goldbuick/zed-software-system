import { createdevice } from 'zss/device'
import { INPUT } from 'zss/gadget/data/types'
import { createpid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  PLAYER_BOOK,
  memorycli,
  memoryplayerlogin,
  memoryplayerlogout,
  memoryreadbook,
  memoryreadchip,
  memoryresetbooks,
  memorysetdefaultplayer,
  memorytick,
} from 'zss/memory'
import { BOOK, bookfindcodepage, isbook } from 'zss/memory/book'
import { createos } from 'zss/os'

import {
  bip_loginfailed,
  bip_retry,
  register_flush,
  tape_crash,
  tape_debug,
  tape_info,
} from './api'
import { UNOBSERVE_FUNC, modemobservevaluestring } from './modem'

// this should be unique every time the worker is created
const playerid = createpid()
memorysetdefaultplayer(playerid)

// manages chips
const os = createos()

// remember last tick for cli invokes
let lasttick = 0

// tracking active player ids
const SECOND_TIMEOUT = 32
const tracking: Record<string, number> = {}

// control how fast we persist to the register
const FLUSH_RATE = 4
let flushtick = 0

// track watched codepage memory
const watching: Record<string, Record<string, Set<string>>> = {}
const observers: Record<string, MAYBE<UNOBSERVE_FUNC>> = {}

const vm = createdevice('vm', ['tick', 'second'], (message) => {
  switch (message.target) {
    case 'mem':
      if (message.player === playerid && isbook(message.data)) {
        const book: BOOK = message.data
        memoryresetbooks(book)
        // message
        tape_info(vm.name(), 'vm reset with', book.name, message.player)
        bip_retry(vm.name(), message.player)
      }
      break
    case 'login':
      if (message.player) {
        if (memoryplayerlogin(message.player)) {
          tracking[message.player] = 0
          tape_info(vm.name(), 'player login', message.player)
        } else {
          if (ispresent(memoryreadbook(PLAYER_BOOK))) {
            tape_crash(vm.name())
          } else {
            bip_loginfailed(vm.name(), message.player)
          }
        }
      }
      break
    case 'doot':
      if (message.player) {
        // player keepalive
        tracking[message.player] = 0
        tape_debug(vm.name(), 'active', message.player)
      }
      break
    case 'input':
      if (message.player) {
        // player input
        const memory = memoryreadchip(message.player)
        const [input = INPUT.NONE, mods = 0] = message.data ?? {}
        memory.inputqueue.add(input)
        memory.inputmods[input as INPUT] = mods
      }
      break
    case 'pagewatch':
      if (message.player && Array.isArray(message.data)) {
        const [book, page] = message.data
        // start watching
        if (!ispresent(observers[page])) {
          observers[page] = modemobservevaluestring(page, (value) => {
            // write to code
            const codepage = bookfindcodepage(memoryreadbook(book), page)
            if (ispresent(codepage)) {
              // TODO: should only update code through helper func
              // the idea is that if you change the codepage type
              // your data needs to be set to a working default value
              codepage.code = value
            }
          })
        }
        // track use
        if (!ispresent(watching[book]?.[page])) {
          watching[book] = watching[book] ?? {}
          watching[book][page] = new Set()
        }
        watching[book][page].add(message.player)
      }
      break
    case 'pagerelease':
      if (message.player && Array.isArray(message.data)) {
        const [book, page] = message.data
        if (ispresent(watching[book])) {
          if (ispresent(watching[book][page])) {
            watching[book][page].delete(message.player)
            // stop watching
            if (watching[book][page].size === 0) {
              observers[page]?.()
              observers[page] = undefined
            }
          }
        }
      }
      break
    case 'tick':
      // from clock
      lasttick = message.data ?? 0
      memorytick(os, lasttick)
      break
    case 'second':
      // from clock & iterate over logged in players to check activity
      Object.keys(tracking).forEach((player) => {
        ++tracking[player]
        if (tracking[player] >= SECOND_TIMEOUT) {
          // drop inactive players (logout)
          delete tracking[player]
          memoryplayerlogout(player)
          // message
          tape_info(vm.name(), 'player logout', player)
          vm.emit('logout', undefined, player)
        }
      })
      if (flushtick >= FLUSH_RATE) {
        flushtick = 0
        const book = memoryreadbook(PLAYER_BOOK)
        register_flush(vm.name(), book)
      }
      ++flushtick
      break
    case 'cli':
      // user input from built-in console
      memorycli(os, lasttick, message.player ?? '', message.data ?? '')
      break
    default:
      // running software messages
      os.message(message)
      break
  }
})

export function ready() {
  // TODO: load default software ...
  // signal ready state
  vm.emit('ready', undefined, playerid)
}
