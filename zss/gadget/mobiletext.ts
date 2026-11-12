/** Hidden document field for Tier A mobile text (IME + soft keyboard). See `bootstrapmobiletextcapture`. */

export type Mobiletextfield = HTMLInputElement | HTMLTextAreaElement

export type MobiletextInputCallback = (
  value: string,
  selectionstart: number,
) => void

let mobiletextelement: Mobiletextfield | null = null

const subscribers = new Set<MobiletextInputCallback>()
const subscribercleanups = new Map<MobiletextInputCallback, () => void>()

/**
 * Temporary Safari soft-keyboard probe. Filter DevTools console for `[softkb`.
 * Hypotheses: H1 capture-flag, H2 mount, H3 terminal-input-gate, H4 pointer,
 * H5 focus/blur, H6 visualViewport, H7 actionrow.
 */
export function softkblog(
  hypothesis: string,
  message: string,
  data?: Record<string, unknown>,
) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  // eslint-disable-next-line no-console -- intentional soft-keyboard probe
  console.info(`[softkb ${hypothesis}] ${message}`, {
    t: Date.now(),
    vvH: vv ? Math.round(vv.height) : null,
    innerH:
      typeof window !== 'undefined' ? Math.round(window.innerHeight) : null,
    active:
      typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement | null)?.tagName ?? null
        : null,
    activeClass:
      typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement | null)?.className || null
        : null,
    ...data,
  })
}

function softkbfocusprobe(label: string) {
  softkblog('H5', label, {
    hasEl: !!mobiletextelement,
    elIsActive: document.activeElement === mobiletextelement,
  })
}

function attachsubscriber(
  callback: MobiletextInputCallback,
  element: Mobiletextfield,
) {
  let composing = false
  function run() {
    callback(element.value, element.selectionStart ?? 0)
  }
  function oninput() {
    if (!composing) {
      run()
    }
  }
  function oncompositionstart() {
    composing = true
  }
  function oncompositionend() {
    composing = false
    run()
  }
  element.addEventListener('input', oninput)
  element.addEventListener('compositionstart', oncompositionstart)
  element.addEventListener('compositionend', oncompositionend)
  subscribercleanups.set(callback, () => {
    element.removeEventListener('input', oninput)
    element.removeEventListener('compositionstart', oncompositionstart)
    element.removeEventListener('compositionend', oncompositionend)
  })
}

function detachsubscriber(callback: MobiletextInputCallback) {
  const cleanup = subscribercleanups.get(callback)
  cleanup?.()
  subscribercleanups.delete(callback)
}

/** Called when the hidden field mounts; wires all pending `onmobiletextinput` subscribers. */
export function setmobiletextelement(element: Mobiletextfield | null) {
  for (const cleanup of subscribercleanups.values()) {
    cleanup()
  }
  subscribercleanups.clear()
  mobiletextelement = element
  if (element) {
    for (const callback of subscribers) {
      attachsubscriber(callback, element)
    }
  }
}

export function getmobiletextelement(): Mobiletextfield | null {
  return mobiletextelement
}

export function mobiletextfocus() {
  softkbfocusprobe('focus:before')
  if (!mobiletextelement) {
    softkblog('H2', 'focus:no-element')
    return
  }
  // preventScroll: iOS otherwise scrolls the off-screen capture field into view
  // and can drop the soft-keyboard user activation.
  mobiletextelement.focus({ preventScroll: true })
  softkbfocusprobe('focus:sync-after')
  queueMicrotask(() => softkbfocusprobe('focus:microtask'))
  requestAnimationFrame(() => {
    softkbfocusprobe('focus:raf')
    requestAnimationFrame(() => softkbfocusprobe('focus:raf2'))
  })
}

export function mobiletextblur() {
  softkblog('H5', 'blur:call')
  mobiletextelement?.blur()
}

/**
 * Subscribe to hidden input value changes. Skips sync during IME composition;
 * callback runs on `input` when not composing and on `compositionend`.
 * If the input is not mounted yet, subscribes when it appears.
 * Returns unsubscribe.
 */
export function onmobiletextinput(
  callback: MobiletextInputCallback,
): () => void {
  subscribers.add(callback)
  if (mobiletextelement) {
    attachsubscriber(callback, mobiletextelement)
  }
  return () => {
    subscribers.delete(callback)
    detachsubscriber(callback)
  }
}
