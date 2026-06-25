const WANIX_DOM_POPUP_FEATURES =
  'noopener,noreferrer,width=520,height=360,menubar=no,toolbar=no'

let pendingpopup: Window | null = null

/** Open a blank popup synchronously (call before await while user gesture is active). */
export function preparewanixdompopup(): Window | null {
  if (typeof window === 'undefined') {
    return null
  }
  const win = window.open('about:blank', '_blank', WANIX_DOM_POPUP_FEATURES)
  pendingpopup = win
  return win
}

export function fillwanixdompopup(win: Window | null, html: string) {
  if (!win || win.closed) {
    return
  }
  try {
    win.document.open()
    win.document.write(html)
    win.document.close()
  } catch {
    // popup blocked or cross-origin after navigation
  }
}

/** Fill a prepared popup, or open + fill when no prior prepare call. */
export function openwanixdompopup(html: string) {
  const win = pendingpopup ?? preparewanixdompopup()
  pendingpopup = null
  fillwanixdompopup(win, html)
  return win
}
