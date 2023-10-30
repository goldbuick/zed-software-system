import zsscode from 'bundle-text:./tape/main.txt'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'

const device = createDevice('tape', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('platform:boot', device.name(), ['gadget', 'gadget', zsscode])
      break
  }
})
