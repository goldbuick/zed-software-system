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

import { tape_error, tape_log } from './api'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
const player = `pid_${justNumberChars()}_${mixedChars()}`
memorysetdefaultplayer(player)

// manages chips
const os = createos()

// tracking active player ids
const LOOP_TIMEOUT = 32 * 15
const tracking: Record<string, number> = {}

const vm = createdevice('vm', ['login', 'tick', 'tock'], (message) => {
  switch (message.target) {
    case 'mem':
      if (message.player === player) {
        memoryresetbooks(message.data)
        tape_log(vm.id(), 'memset')
        vm.emit('memset', undefined, message.player)
      }
      break
    case 'login':
      if (message.player) {
        if (memoryplayerlogin(message.player)) {
          tracking[message.player] = 0
        } else {
          tape_error(vm.id(), 'with login')
          vm.emit('error', 'with login', message.player)
        }
      }
      break
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
          tape_log(vm.id(), 'logout', player)
          vm.emit('player', 'did logout', player)
        }
      })
      break
    case 'doot':
      // player keepalive
      if (message.player) {
        tracking[message.player] = 0
        tape_log(vm.id(), '.', message.player)
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
    default:
      os.message(message)
      break
  }
})

export function ready() {
  // TODO: load default software ...
  // signal ready state
  vm.emit('ready', undefined, player)
}
