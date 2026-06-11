import type { DEVICELIKE } from 'zss/device/api'

export type DEEPLINK_SURFACE = 'boot' | 'menu' | 'cli'

export type DEEPLINK_CONTEXT = {
  player: string
  surface: DEEPLINK_SURFACE
  openterminal?: boolean
  device?: DEVICELIKE
}

export type DEEPLINK_HANDLER = {
  id: string
  paramkeys: string[]
  match: () => boolean
  readdata: () => unknown
  fingerprint: (data: unknown) => string
  run: (ctx: DEEPLINK_CONTEXT, data: unknown) => Promise<boolean>
}

const DEEPLINK_CLAIM_PREFIX = 'zss-deeplink-'

const handlers: DEEPLINK_HANDLER[] = []
let initpromise: Promise<void> | undefined

export function registerdeeplink(handler: DEEPLINK_HANDLER) {
  handlers.push(handler)
}

export function clearqueryparams(keys: string[]) {
  try {
    const url = new URL(location.href)
    let changed = false
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        changed = true
      }
    }
    if (!changed) {
      return
    }
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    // no window in workers / cli
  }
}

export function claimdeeplink(id: string, fingerprint: string): boolean {
  const key = `${DEEPLINK_CLAIM_PREFIX}${id}-${fingerprint}`
  try {
    if (sessionStorage.getItem(key)) {
      return false
    }
    sessionStorage.setItem(key, '1')
    return true
  } catch {
    return true
  }
}

async function ensuredeeplinksinited() {
  initpromise ??= import('zss/feature/deeplink/znslogin').then((mod) => {
    mod.registerznslogindeeplink()
  })
  await initpromise
}

export function initdeeplinks() {
  void ensuredeeplinksinited()
}

export async function rundeeplinks(ctx: DEEPLINK_CONTEXT): Promise<boolean> {
  await ensuredeeplinksinited()
  for (const handler of handlers) {
    if (!handler.match()) {
      continue
    }
    const data = handler.readdata()
    const fingerprint = handler.fingerprint(data)
    if (!claimdeeplink(handler.id, fingerprint)) {
      return false
    }
    clearqueryparams(handler.paramkeys)
    return handler.run(ctx, data)
  }
  return false
}
