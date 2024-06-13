import { createdevice } from 'zss/device'
import { INPUT } from 'zss/gadget/data/types'
import { createpid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
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
import { BOOK, isbook } from 'zss/memory/book'
import { createos } from 'zss/os'

import {
  bip_loginfailed,
  bip_retry,
  register_flush,
  tape_crash,
  tape_debug,
  tape_info,
} from './api'

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
const FLUSH_RATE = 1
let flushtick = 0

const vm = createdevice('vm', ['tick', 'second'], (message) => {
  switch (message.target) {
    case 'mem':
      if (message.player === playerid && isbook(message.data)) {
        const book: BOOK = message.data
        memoryresetbooks(book)
        // message
        tape_info(vm.name(), 'vm reset with', book.name, message.player)
        bip_retry(vm.name(), message.player)
        console.info(book)
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
        console.info(book)
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
