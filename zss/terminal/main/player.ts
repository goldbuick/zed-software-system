import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createDevice } from 'zss/network/device'

const justNumberChars = customAlphabet(numbers, 4)

const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the page loads
export const player = `pid_${justNumberChars()}_${mixedChars()}`

const playerdevice = createDevice('player', ['ready'], (message) => {
  switch (message.target) {
    case 'ready':
      playerdevice.emit('platform:login', undefined, player)
      break
  }
})

// activity ping
function keepAlive() {
  playerdevice.emit('platform:doot', undefined, player)
  setTimeout(keepAlive, 8 * 1000)
}

keepAlive()
