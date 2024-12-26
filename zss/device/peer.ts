import { createdevice } from 'zss/device'

const peer = createdevice('peer', ['second'], (message) => {
  switch (message.target) {
    case 'host':
      break
  }
})
