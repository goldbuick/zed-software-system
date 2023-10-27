import { hub } from 'zss/network/hub'

document.addEventListener('keydown', (event) => {
  event.preventDefault()
  hub.emit('input:key', event.key)
  // console.info('keydown', event.key)
})
