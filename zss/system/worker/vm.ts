import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createDevice } from 'zss/network/device'

import { LOGIN_SET } from '../firmware/loader'
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

createDevice('vm', ['tick'], (message) => {
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
        os.boot({
          group: message.player,
          firmware: LOGIN_SET,
          // where does this code come from ?
          code: '"STUFF"',
        })
      }
      break
    case 'doot':
      if (message.player) {
        tracking[message.player] = 0
      }
      break
    default:
      console.info({ message })
      break
  }
  // if (message.player) {
  //   switch (message.target) {
  //     case 'login':
  //       // const appgadget = select(vm.get('app:gadget'))
  //       // if (appgadget?.type === CONTENT_TYPE.CODE) {
  //       //   tracking[message.player] = 0
  //       //   vm.login(message.player)
  //       //   os.boot({
  //       //     group: message.player,
  //       //     firmware: LOGIN_SET,
  //       //     code: appgadget.code,
  //       //   })
  //       // }
  //       break

  //     case 'keydown':
  //       // console.info(message)
  //       break

  //     case 'doot':
  //       // tracking[message.player] = 0
  //       break

  //     case 'desync':
  //       // const state = gadgetstate(message.player)
  //       // platform.emit('gadgetclient:reset', state, message.player)
  //       break

  //     case 'clearscroll':
  //       // clearscroll(message.player)
  //       break

  //     default: //
  //       break
  //   }
  //   return
  // }

  // switch (message.target) {

  // }
  // os.message(message)
})
