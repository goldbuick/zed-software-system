import { proxy, useSnapshot } from 'valtio'

const toggle = proxy({ blink: false })

setInterval(() => {
  toggle.blink = !toggle.blink
}, 333)

export function useBlink() {
  const state = useSnapshot(toggle)
  return state.blink
}
