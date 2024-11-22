import { create } from 'zustand'

const useToggle = create<{ blink: boolean }>(() => ({ blink: false }))

setInterval(() => {
  useToggle.setState((state) => ({ blink: !state.blink }))
}, 333)

export function useBlink() {
  return useToggle((state) => state.blink)
}
