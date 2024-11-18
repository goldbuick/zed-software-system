const toggle = { blink: false }

setInterval(() => {
  toggle.blink = !toggle.blink
}, 333)

export function useBlink() {
  const state = toggle
  return state.blink
}
