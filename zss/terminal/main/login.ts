import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'

import { systemId } from '../main/id'

const device = createDevice('login', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('platform:login', device.name(), undefined, systemId)
      break
  }
})
