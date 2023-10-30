import zsscode from 'bundle-text:zss/test/layout.txt'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'

createDevice('test', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('platform:boot', 'test', ['gadget', zsscode])
      break
  }
})
