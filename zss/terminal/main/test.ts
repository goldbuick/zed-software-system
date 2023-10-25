import zsscode from 'bundle-text:zss/test/layout.txt'

import { createDevice } from '/zss/network/device'
import { hub } from '/zss/network/hub'

const test = createDevice('test', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('boot', zsscode)
      break
  }
})
