const SW_URL = '/wasm/maximilian/enable-threads.js'
const RELOAD_GUARD_KEY = 'zss_maxim_coep_reload'

let coepinflight: Promise<void> | undefined
let coepready = false

export async function clearmaximilianserviceworkers() {
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

/** Register maximilian-js-local COOP/COEP service worker for SharedArrayBuffer. */
export async function ensuremaximiliancoep(): Promise<void> {
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
    await clearmaximilianserviceworkers()
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
      console.warn(
        'maximilian COOP/COEP service worker registration failed',
        err,
      )
    }
  })()

  await coepinflight
}
