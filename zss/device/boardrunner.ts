import { createdevice } from 'zss/device'

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }
  switch (message.target) {
    default:
      break
  }
})
