import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { isString } from 'zss/mapping/types'
import { createDevice } from 'zss/network/device'

import { readcode } from '../book'
import { processbook, setprocessboard } from '../firmware/process'
import { createOS } from '../os'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
const player = `pid_${justNumberChars()}_${mixedChars()}`

// manages chips
const os = createOS()

// tracking active player ids
const LOOP_TIMEOUT = 32 * 15
const tracking: Record<string, number> = {}

const vm = createDevice('vm', ['login', 'tick', 'tock'], (message) => {
  switch (message.target) {
    case 'login':
      if (message.player) {
        tracking[message.player] = 0
        // read starting code from app:login
        const code = readcode(processbook(), 'app', 'login')
        if (isString(code)) {
          // start player out on title
          setprocessboard(message.player, 'title')
          // start ui for player
          os.boot({
            group: message.player,
            firmware: ['assembler', 'gadget', 'media', 'process'],
            code,
          })
        }
      }
      break
    case 'tick':
      // update chips
      os.tick()
      break
    case 'tock':
      // iterate over logged in players
      Object.keys(tracking).forEach((player) => {
        ++tracking[player]
        if (tracking[player] > LOOP_TIMEOUT) {
          // drop inactive players (logout)
          delete tracking[player]
          os.haltGroup(player)
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
