import { createdevice } from 'zss/device'

let boardrunnerplayer = ''

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    default:
      // todo: add filtering here
      break
  }

  switch (message.target) {
    case 'start':
      if (!boardrunnerplayer) {
        boardrunnerplayer = message.player
      }
      break
    default:
      break
  }
})
