import { createdevice } from 'zss/device'

let boardrunnerplayer = ''

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  console.info('boardrunner', message.target, message.data)

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
