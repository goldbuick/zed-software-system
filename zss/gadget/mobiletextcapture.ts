import { useTape } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { setupmobiletextkeyboardlisteners } from 'zss/gadget/userinput'

import { setmobiletextelement, softkblog } from './mobiletext'

let unsubkeyboard: (() => void) | undefined
let captureel: HTMLTextAreaElement | null = null
let storeunsub: (() => void) | undefined
/** Prevent blur->focus->blur loops if hold-focus fails. */
let refocusguard = false

function shouldholdsoftkeyboard(): boolean {
  if (!captureel || !useDeviceData.getState().usemobiletextcapture) {
    return false
  }
  const { terminal, terminalmode, editor } = useTape.getState()
  return editor.open || terminal.open || terminalmode === 'quick'
}

function oncapturefocus() {
  softkblog('H5', 'capture:dom-focus')
  useDeviceData.setState({ textcapturefocused: true })
}

function oncaptureblur(event: FocusEvent) {
  const related =
    (event.relatedTarget as HTMLElement | null)?.tagName ?? null
  // iOS blurs the capture field when visualViewport shrinks for the keyboard
  // even with layout frozen (softkb H5 after H6 skipped). Re-focus in the same
  // blur turn while CLI/editor still owns text input so the KB stays up.
  if (shouldholdsoftkeyboard() && captureel && !refocusguard) {
    refocusguard = true
    softkblog('H5', 'capture:dom-blur-refocus', { related })
    captureel.focus({ preventScroll: true })
    queueMicrotask(() => {
      refocusguard = false
    })
    return
  }
  softkblog('H5', 'capture:dom-blur', { related, held: false })
  useDeviceData.setState({ textcapturefocused: false })
}

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
      softkblog('H2', 'mount:already')
      return
    }
    const ta = document.createElement('textarea')
    ta.className = 'mobiletextcapture'
    ta.rows = 1
    ta.setAttribute('autocapitalize', 'off')
    ta.setAttribute('autocomplete', 'off')
    ta.setAttribute('autocorrect', 'off')
    ta.setAttribute('enterkeyhint', 'enter')
    ta.inputMode = 'text'
    ta.spellcheck = false
    ta.setAttribute('translate', 'no')
    // Do not set aria-hidden: iOS treats that as non-editable and drops the KB.
    ta.tabIndex = -1
    ta.addEventListener('focus', oncapturefocus)
    ta.addEventListener('blur', oncaptureblur)
    document.body.appendChild(ta)
    captureel = ta
    setmobiletextelement(ta)
    unsubkeyboard = setupmobiletextkeyboardlisteners(ta)
    softkblog('H2', 'mount:ok', {
      className: ta.className,
      tabIndex: ta.tabIndex,
    })
  }

  function unmount() {
    softkblog('H2', 'unmount')
    if (unsubkeyboard) {
      unsubkeyboard()
      unsubkeyboard = undefined
    }
    if (captureel) {
      captureel.removeEventListener('focus', oncapturefocus)
      captureel.removeEventListener('blur', oncaptureblur)
      captureel.remove()
      captureel = null
    }
    setmobiletextelement(null)
    useDeviceData.setState({ textcapturefocused: false })
  }

  let last = useDeviceData.getState().usemobiletextcapture
  softkblog('H1', 'bootstrap', { usemobiletextcapture: last })
  if (last) {
    mount()
  }

  storeunsub = useDeviceData.subscribe((state) => {
    const next = state.usemobiletextcapture
    if (next === last) {
      return
    }
    softkblog('H1', 'flag-change', {
      from: last,
      to: next,
    })
    last = next
    if (next) {
      mount()
    } else {
      unmount()
    }
  })
}
