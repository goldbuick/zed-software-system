import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

const SW_URL = '/coep/enable-threads.js'
const RELOAD_GUARD_KEY = 'zss_wasm_coep_reload'

let coepinflight: Promise<void> | undefined
let coepready = false

/** Overridable for Jest (jsdom cannot redefine window.location). */
let reloadpage = () => {
  window.location.reload()
}

export function setwasmcoepreloadfortest(fn: () => void) {
  reloadpage = fn
}

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

/** Cafe build token — one COEP isolation reload allowed per deploy. */
export function readcoepbuildtoken(): string {
  const commit = (process.env.ZSS_COMMIT_HASH ?? '').trim()
  if (!commit || commit === 'false') {
    return 'unknown'
  }
  return commit
}

function readreloadguard(): string | null {
  try {
    return localStorage.getItem(RELOAD_GUARD_KEY)
  } catch {
    return null
  }
}

function writereloadguard(token: string): void {
  try {
    localStorage.setItem(RELOAD_GUARD_KEY, token)
  } catch {
    //
  }
}

/** Test helper — reset module latches between Jest cases. */
export function resetwasmcoepfortest() {
  coepinflight = undefined
  coepready = false
  reloadpage = () => {
    window.location.reload()
  }
}

/**
 * Vite cafe:dev sets NODE_ENV=development (headers already isolate).
 * Jest uses NODE_ENV=test so the SW path remains testable.
 */
function shouldskipcoepserviceworker(): boolean {
  return process.env.NODE_ENV === 'development'
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

  // Local Vite COOP/COEP headers — the SW reload loop breaks HMR.
  if (shouldskipcoepserviceworker()) {
    await clearwasmcoepserviceworkers()
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  coepinflight ??= (async () => {
    try {
      // Bust SW script URL per cafe deploy so each build can install/claim.
      const buildtoken = readcoepbuildtoken()
      await navigator.serviceWorker.register(`${SW_URL}?v=${buildtoken}`)
      const ready = await navigator.serviceWorker.ready

      // clients.claim() can set controller without a COEP navigation — only
      // crossOriginIsolated means SharedArrayBuffer is available.
      if (window.crossOriginIsolated) {
        coepready = true
        return
      }

      const active = ready.active
      if (!active) {
        return
      }

      // One reload per cafe build (localStorage), not per tab/session.
      if (readreloadguard() === buildtoken) {
        apierror(
          SOFTWARE,
          '',
          'wasm',
          'COOP/COEP isolation failed after reload - SharedArrayBuffer unavailable',
        )
        return
      }
      writereloadguard(buildtoken)
      reloadpage()
    } catch (err) {
      apierror(
        SOFTWARE,
        '',
        'wasm',
        'COOP/COEP service worker registration failed',
        err,
      )
    }
  })()

  await coepinflight
}
