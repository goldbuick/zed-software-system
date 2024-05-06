import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createdevice } from 'zss/device'
import { INPUT } from 'zss/gadget/data/types'
import {
  memoryplayerlogin,
  memoryplayerlogout,
  memoryreadchip,
  memoryresetbooks,
  memorysetdefaultplayer,
  memorytick,
} from 'zss/memory'
import { createos } from 'zss/os'

import { api_error, tape_log } from './api'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
const playerid = `pid_${justNumberChars()}_${mixedChars()}`
memorysetdefaultplayer(playerid)

// manages chips
const os = createos()

// tracking active player ids
const LOOP_TIMEOUT = 32 * 15
const tracking: Record<string, number> = {}

const vm = createdevice('vm', ['tick', 'tock'], (message) => {
  switch (message.target) {
    case 'mem':
      if (message.player === playerid) {
        memoryresetbooks(message.data)
        tape_log(vm.name(), 'ackmem', message.player)
        vm.emit('ackmem', undefined, message.player)
      }
      break
    case 'login':
      if (message.player) {
        if (memoryplayerlogin(message.player)) {
          tracking[message.player] = 0
          tape_log(vm.name(), 'acklogin', message.player)
          vm.emit('acklogin', undefined, message.player)
        } else {
          api_error(vm.name(), 'with login', message.player)
        }
      }
      break
    case 'doot':
      // player keepalive
      if (message.player) {
        tracking[message.player] = 0
        tape_log(vm.name(), '.', message.player)
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
      memorytick(os, message.data)
      break
    case 'tock':
      // iterate over logged in players
      Object.keys(tracking).forEach((player) => {
        ++tracking[player]
        if (tracking[player] > LOOP_TIMEOUT) {
          // drop inactive players (logout)
          delete tracking[player]
          memoryplayerlogout(player)
          tape_log(vm.name(), 'logout', player)
          vm.emit('logout', undefined, player)
        }
      })
      break
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
