import { registerznslogindeeplink } from 'zss/feature/deeplink/znslogin'

let deeplinksinited = false

function ensuredeeplinksinited() {
  if (deeplinksinited) {
    return
  }
  deeplinksinited = true
  registerznslogindeeplink()
}

/** Register built-in deeplink handlers (call once at register boot). */
export function initdeeplinks() {
  ensuredeeplinksinited()
}
