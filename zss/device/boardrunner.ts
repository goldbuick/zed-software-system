import { createdevice } from 'zss/device'

const boardrunner = createdevice('gadgetclient', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  console.info('boardrunner', message)
})
