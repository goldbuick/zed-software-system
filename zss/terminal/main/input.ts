import { hub } from 'zss/network/hub'

import { playerId } from './playerId'

document.addEventListener('keydown', (event) => {
  event.preventDefault()
  hub.emit('input:key', 'gadget', event.key, playerId)
})
