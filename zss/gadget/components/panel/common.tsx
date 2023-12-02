import { hub } from 'zss/network/hub'

export function clearscroll(player: string) {
  // send a message to trigger the close
  hub.emit('platform:clearscroll', 'gadget', undefined, player)
}
