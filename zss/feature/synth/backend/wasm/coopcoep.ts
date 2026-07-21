import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

const SW_URL = '/coep/enable-threads.js'
const RELOAD_GUARD_PREFIX = 'zss_wasm_coep_reload:'

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

/** Simple stable token for the SW script body (length + hash). */
export function hashcoepswbody(text: string): string {
  let hash = 2166136261
  for (let i = 0; i < text.length; ++i) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${text.length}:${hash >>> 0}`
}

function readreloadguardkey(swurl: string): string {
  return `${RELOAD_GUARD_PREFIX}${swurl}`
}

function readreloadguard(swurl: string): string | null {
  try {
    return localStorage.getItem(readreloadguardkey(swurl))
  } catch {
    return null
  }
}

function writereloadguard(swurl: string, token: string): void {
  try {
    localStorage.setItem(readreloadguardkey(swurl), token)
  } catch {
    //
  }
}

async function readswversiontoken(swurl: string): Promise<string> {
  const response = await fetch(swurl, { cache: 'no-store' })
  if (!response.ok) {
    return `${swurl}:unreadable`
  }
  const text = await response.text()
  return `${swurl}:${hashcoepswbody(text)}`
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
      await navigator.serviceWorker.register(SW_URL)
      const ready = await navigator.serviceWorker.ready

      if (navigator.serviceWorker.controller) {
        coepready = window.crossOriginIsolated
        return
      }

      const active = ready.active
      if (!active) {
        return
      }

      // Active SW but this document is not controlled yet — one reload per SW
      // script version (localStorage), not per tab/session.
      const versiontoken = await readswversiontoken(SW_URL)
      if (readreloadguard(SW_URL) === versiontoken) {
        return
      }
      writereloadguard(SW_URL, versiontoken)
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
