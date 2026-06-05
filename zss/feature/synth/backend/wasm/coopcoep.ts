import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

const SW_URL = '/wasm/coep/enable-threads.js'
const RELOAD_GUARD_KEY = 'zss_wasm_coep_reload'

let coepinflight: Promise<void> | undefined
let coepready = false

export async function clearwasmcoepserviceworkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((reg) => reg.active?.scriptURL.includes('enable-threads'))
      .map((reg) => reg.unregister()),
  )
}

/** Register COOP/COEP service worker for SharedArrayBuffer. */
export async function ensurewasmcoep(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }
  if (window.crossOriginIsolated) {
    coepready = true
    return
  }
  if (coepready) {
    return
  }

  // Local dev uses Vite COOP/COEP headers — the SW reload loop breaks HMR.
  if (import.meta.env.DEV) {
    await clearwasmcoepserviceworkers()
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  coepinflight ??= (async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL)
      if (registration.active && !navigator.serviceWorker.controller) {
        if (!sessionStorage.getItem(RELOAD_GUARD_KEY)) {
          sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
          window.location.reload()
        }
        return
      }
      sessionStorage.removeItem(RELOAD_GUARD_KEY)
      coepready = window.crossOriginIsolated
    } catch (err) {
      apierror(SOFTWARE, '', 'wasm', 'COOP/COEP service worker registration failed', err)
    }
  })()

  await coepinflight
}
