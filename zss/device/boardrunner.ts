import { createdevice } from 'zss/device'

import { vmboardrunnerack } from './api'

let assignedplayer = ''
let assignedboard = ''

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'tick':
      if (message.player !== assignedplayer) {
        return
      }
      break
    default:
      // todo: add filtering here
      console.info('boardrunner', message.target, message.data)
      break
  }

  switch (message.target) {
    case 'start':
      if (!assignedplayer) {
        assignedplayer = message.player
      }
      break
    case 'tick': {
      if (assignedboard !== message.data) {
        assignedboard = message.data
        console.info('boardrunner', 'switched to board', assignedboard)
      }
      // todo: add logic to tick the boards this runner is responsible for
      vmboardrunnerack(boardrunner, assignedplayer)
      break
    }
    default:
      break
  }
})
