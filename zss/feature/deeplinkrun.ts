import { clearqueryparams } from 'zss/feature/clearqueryparams'
import {
  type DEEPLINK_CONTEXT,
  listdeeplinkhandlers,
} from 'zss/feature/deeplinkregistry'

/** Leaf: claim + rundeeplinks — no znslogin/url imports (init-cycle safe). */

const DEEPLINK_CLAIM_PREFIX = 'zss-deeplink-'

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

export async function rundeeplinks(ctx: DEEPLINK_CONTEXT): Promise<boolean> {
  for (const handler of listdeeplinkhandlers()) {
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
