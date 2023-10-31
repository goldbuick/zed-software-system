import { customAlphabet } from 'nanoid'
import { nolookalikes } from 'nanoid-dictionary'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'

const createPlayerId = customAlphabet(nolookalikes, 16)

// this should be unique every time the page loads
export const playerId = `zid_${createPlayerId()}`

const device = createDevice('playerid', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('platform:login', device.name(), undefined, playerId)
      break
  }
})
