import { useDeviceData } from 'zss/gadget/device'
import { setupmobiletextkeyboardlisteners } from 'zss/gadget/userinput'

import { setmobiletextelement } from './mobiletext'

let unsubkeyboard: (() => void) | undefined
let captureel: HTMLTextAreaElement | null = null
let storeunsub: (() => void) | undefined

/**
 * Tier A hidden `<textarea>` for soft keyboard / IME (multi-line for editor; terminal strips
 * newlines in [`terminal/input.tsx`](zss/screens/terminal/input.tsx)). No React hooks — a second
 * `createRoot` would duplicate React and break `useDeviceData` / zustand. Mount/unmount follows
 * `usemobiletextcapture` from `Engine` (device store).
 */
export function bootstrapmobiletextcapture() {
  if (storeunsub) {
    return
  }

  function mount() {
    if (captureel) {
      return
    }
    const ta = document.createElement('textarea')
    ta.className = 'mobiletextcapture'
    ta.rows = 1
    ta.setAttribute('autocapitalize', 'off')
    ta.setAttribute('autocomplete', 'off')
    ta.spellcheck = false
    ta.setAttribute('translate', 'no')
    ta.setAttribute('aria-hidden', 'true')
    ta.tabIndex = -1
    document.body.appendChild(ta)
    captureel = ta
    setmobiletextelement(ta)
    unsubkeyboard = setupmobiletextkeyboardlisteners(ta)
  }

  function unmount() {
    if (unsubkeyboard) {
      unsubkeyboard()
      unsubkeyboard = undefined
    }
    if (captureel) {
      captureel.remove()
      captureel = null
    }
    setmobiletextelement(null)
  }

  let last = useDeviceData.getState().usemobiletextcapture
  if (last) {
    mount()
  }

  storeunsub = useDeviceData.subscribe((state) => {
    const next = state.usemobiletextcapture
    if (next === last) {
      return
    }
    last = next
    if (next) {
      mount()
    } else {
      unmount()
    }
  })
}
