import { deepcopy } from 'zss/mapping/types'

const CROSSLOGIN_FLAGS_SESSION_KEY = 'zss.crosslogin.flags'

let crossloginflags: Record<string, unknown> | undefined

function writesessionflags(flags: Record<string, unknown> | undefined): void {
  try {
    if (typeof sessionStorage === 'undefined') {
      return
    }
    if (!flags) {
      sessionStorage.removeItem(CROSSLOGIN_FLAGS_SESSION_KEY)
      return
    }
    sessionStorage.setItem(CROSSLOGIN_FLAGS_SESSION_KEY, JSON.stringify(flags))
  } catch {
    // sessionStorage may be unavailable (private mode / SSR)
  }
}

function readsessionflags(): Record<string, unknown> | undefined {
  try {
    if (typeof sessionStorage === 'undefined') {
      return undefined
    }
    const raw = sessionStorage.getItem(CROSSLOGIN_FLAGS_SESSION_KEY)
    if (!raw) {
      return undefined
    }
    sessionStorage.removeItem(CROSSLOGIN_FLAGS_SESSION_KEY)
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }
    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}

/**
 * Hold live book flags for the next vmlogin (soft join or content
 * cross-login). Also written to sessionStorage so content navigation
 * survives a full page reload.
 */
export function setcrossloginflags(flags: Record<string, unknown>): void {
  crossloginflags = deepcopy(flags)
  writesessionflags(crossloginflags)
}

export function takecrossloginflags(): Record<string, unknown> | undefined {
  if (crossloginflags) {
    const flags = crossloginflags
    crossloginflags = undefined
    writesessionflags(undefined)
    return flags
  }
  return readsessionflags()
}

export function clearcrossloginflags(): void {
  crossloginflags = undefined
  writesessionflags(undefined)
}

export function readcrossloginflags(): Record<string, unknown> | undefined {
  if (crossloginflags) {
    return crossloginflags
  }
  try {
    if (typeof sessionStorage === 'undefined') {
      return undefined
    }
    const raw = sessionStorage.getItem(CROSSLOGIN_FLAGS_SESSION_KEY)
    if (!raw) {
      return undefined
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }
    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}
