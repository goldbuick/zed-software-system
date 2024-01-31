import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { proxy } from 'valtio'
import { BIOS } from 'zss/bios'
import { readboard } from 'zss/system/book'
import { createdevice } from 'zss/system/device'
import { createos } from 'zss/system/os'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
const player = `pid_${justNumberChars()}_${mixedChars()}`

// manages chips
const os = createos()

// sim state
export const VM_MEMORY = proxy({
  book: BIOS, // starting software to run
  flags: {} as Record<string, any>, // global flags by player
  players: {} as Record<string, string>, // map of player to board
})

// tracking active player ids
const LOOP_TIMEOUT = 32 * 15
const tracking: Record<string, number> = {}

const vm = createdevice('vm', ['login', 'tick', 'tock'], (message) => {
  switch (message.target) {
    case 'login':
      if (message.player) {
        tracking[message.player] = 0
        const title = readboard()
        console.info(message)
        /*
        new steps here:
        1. find title board
        2. create player on title board
        3. profit
        */
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
