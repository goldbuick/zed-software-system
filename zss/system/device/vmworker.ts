import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { isArray, isString } from 'zss/mapping/types'
import { createDevice } from 'zss/network/device'

import { readcode, readconfig } from '../book'
import { PROCESS_MEMORY } from '../firmware/process'
import { createOS } from '../os'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
export const sessionId = `sid_${justNumberChars()}_${mixedChars()}`

// manages chips
const os = createOS()

// tracking active player ids
const LOOP_TIMEOUT = 32 * 15
const tracking: Record<string, number> = {}

const vm = createDevice('vm', ['tick'], (message) => {
  switch (message.target) {
    case 'tick':
      // update chips
      os.tick()
      Object.keys(tracking).forEach((player) => {
        ++tracking[player]
        // drop inactive players (logout)
        if (tracking[player] > LOOP_TIMEOUT) {
          delete tracking[player]
          os.haltGroup(player)
        }
      })
      break
    case 'login':
      if (message.player) {
        tracking[message.player] = 0

        const firmware = readconfig(PROCESS_MEMORY, 'firmware')
        if (!isArray(firmware)) {
          return
        }

        const login = readconfig(PROCESS_MEMORY, 'login')
        if (!isString(login)) {
          return
        }

        const [codepage, entry] = login.split(':')
        const code = readcode(PROCESS_MEMORY, codepage, entry)
        if (!isString(code)) {
          return
        }

        console.info(message, { firmware, code })
        os.boot({
          group: message.player,
          firmware: firmware.filter(isString),
          code,
        })
      }
      break
    case 'doot':
      if (message.player) {
        tracking[message.player] = 0
      }
      break
    default:
      os.message(message)
      break
  }
})

queueMicrotask(() => vm.emit('ready'))
