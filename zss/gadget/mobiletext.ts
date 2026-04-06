/** Hidden document field for Tier A mobile text (IME + soft keyboard). See `bootstrapmobiletextcapture`. */

export type Mobiletextfield = HTMLInputElement | HTMLTextAreaElement

export type MobiletextInputCallback = (
  value: string,
  selectionstart: number,
) => void

let mobiletextelement: Mobiletextfield | null = null

const subscribers = new Set<MobiletextInputCallback>()
const subscribercleanups = new Map<MobiletextInputCallback, () => void>()

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
  mobiletextelement?.focus()
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
