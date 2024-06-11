import { createdevice } from 'zss/device'
import { INPUT } from 'zss/gadget/data/types'
import { createpid } from 'zss/mapping/guid'
import {
  memorycli,
  memoryplayerlogin,
  memoryplayerlogout,
  memoryreadchip,
  memoryresetbooks,
  memorysetdefaultplayer,
  memorytick,
} from 'zss/memory'
import { createos } from 'zss/os'

import { tape_debug, tape_info } from './api'

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

const vm = createdevice('vm', ['tick', 'second'], (message) => {
  switch (message.target) {
    case 'mem':
      if (message.player === playerid) {
        memoryresetbooks(message.data)
        tape_info(vm.name(), 'ackmem', message.player)
        vm.emit('ackmem', undefined, message.player)
      }
      break
    case 'login':
      if (message.player) {
        if (memoryplayerlogin(message.player)) {
          tracking[message.player] = 0
          tape_info(vm.name(), 'acklogin', message.player)
          vm.emit('acklogin', undefined, message.player)
        }
      }
      break
    case 'doot':
      // player keepalive
      if (message.player) {
        tracking[message.player] = 0
        tape_debug(vm.name(), message.player, 'active')
        vm.emit('doot', undefined, message.player)
      }
      break
    case 'input':
      // player input
      if (message.player) {
        const memory = memoryreadchip(message.player)
        const [input = INPUT.NONE, mods = 0] = message.data ?? {}
        memory.inputqueue.add(input)
        memory.inputmods[input as INPUT] = mods
      }
      break
    // from clock
    case 'tick':
      lasttick = message.data ?? 0
      memorytick(os, lasttick)
      break
    // iterate over logged in players to check activity
    case 'second':
      Object.keys(tracking).forEach((player) => {
        ++tracking[player]
        if (tracking[player] >= SECOND_TIMEOUT) {
          // drop inactive players (logout)
          delete tracking[player]
          memoryplayerlogout(player)
          tape_info(vm.name(), 'logout', player)
          vm.emit('logout', undefined, player)
        }
      })
      break
    // user input from built-in console
    case 'cli':
      memorycli(os, lasttick, message.player ?? '', message.data ?? '')
      break
    // running software messages
    default:
      os.message(message)
      break
  }
})

export function ready() {
  // TODO: load default software ...
  // signal ready state
  vm.emit('ready', undefined, playerid)
}
