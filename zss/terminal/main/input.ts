import { hub } from 'zss/network/hub'

document.addEventListener('keydown', (event) => {
  event.preventDefault()
  hub.emit('input:key', 'gadget', event.key)
})
