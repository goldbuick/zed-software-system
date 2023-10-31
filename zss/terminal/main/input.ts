import { hub } from 'zss/network/hub'

import { systemId } from './id'

document.addEventListener('keydown', (event) => {
  event.preventDefault()
  hub.emit('input:key', 'gadget', event.key, systemId)
})
