import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'

const justNumberChars = customAlphabet(numbers, 4)

const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the page loads
export const playerId = `pid_${justNumberChars()}_${mixedChars()}`

const device = createDevice('player', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      hub.emit('platform:login', device.name(), undefined, playerId)
      break
  }
})

// activity ping
function keepAlive() {
  hub.emit('platform:doot', device.name(), undefined, playerId)
  setTimeout(keepAlive, 8 * 1000)
}

keepAlive()

// user input

// keyboard
document.addEventListener('keydown', (event) => {
  event.preventDefault()
  hub.emit(
    'platform:keydown',
    device.name(),
    [event.key.toLowerCase(), event.shiftKey, event.metaKey, event.altKey],
    playerId,
  )
})

// gamepad

// mouse

// touch