import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createdevice } from 'zss/device'
import { memoryplayerlogin, memoryplayerlogout, memorytick } from 'zss/memory'
import { createos } from 'zss/os'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
const player = `pid_${justNumberChars()}_${mixedChars()}`

// manages chips
const os = createos()

// tracking active player ids
const LOOP_TIMEOUT = 32 * 15
const tracking: Record<string, number> = {}

const vm = createdevice('vm', ['login', 'tick', 'tock'], (message) => {
  switch (message.target) {
    case 'login':
      if (message.player) {
        tracking[message.player] = 0
        memoryplayerlogin(message.player)
      }
      break
    case 'tick':
      memorytick(os)
      break
    case 'tock':
      // iterate over logged in players
      Object.keys(tracking).forEach((player) => {
        ++tracking[player]
        if (tracking[player] > LOOP_TIMEOUT) {
          // drop inactive players (logout)
          delete tracking[player]
          memoryplayerlogout(player)
        }
      })
      break
    case 'doot':
      // player keepalive
      if (message.player) {
        tracking[message.player] = 0
      }
      break
    default:
      os.message(message)
      break
  }
})

export function ready() {
  vm.emit('login', undefined, player)
}
