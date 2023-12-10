import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'

const justNumberChars = customAlphabet(numbers, 4)

const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the page loads
export const player = `pid_${justNumberChars()}_${mixedChars()}`

const device = createDevice('player', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('platform:login', device.name(), undefined, player)
      break
  }
})

// activity ping
function keepAlive() {
  hub.emit('platform:doot', device.name(), undefined, player)
  setTimeout(keepAlive, 8 * 1000)
}

keepAlive()
