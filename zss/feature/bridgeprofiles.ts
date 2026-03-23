import { get, set } from 'idb-keyval'
import type { BRIDGE_CHAT_START_OBJECT } from 'zss/device/bridge/chattypes'

const BRIDGE_PROFILES_IDB_KEY = 'bridge_profiles_v1'

export async function bridgereadallprofiles(): Promise<
  Record<string, BRIDGE_CHAT_START_OBJECT>
> {
  const raw = await get<Record<string, BRIDGE_CHAT_START_OBJECT>>(
    BRIDGE_PROFILES_IDB_KEY,
  )
  return raw && typeof raw === 'object' ? { ...raw } : {}
}

export async function bridgewriteprofile(
  name: string,
  payload: BRIDGE_CHAT_START_OBJECT,
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) {
    return
  }
  const all = await bridgereadallprofiles()
  all[trimmed] = payload
  await set(BRIDGE_PROFILES_IDB_KEY, all)
}

export async function bridgedeleteprofile(name: string): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) {
    return false
  }
  const all = await bridgereadallprofiles()
  if (!(trimmed in all)) {
    return false
  }
  delete all[trimmed]
  await set(BRIDGE_PROFILES_IDB_KEY, all)
  return true
}

export async function bridgereadprofile(
  name: string,
): Promise<BRIDGE_CHAT_START_OBJECT | undefined> {
  const all = await bridgereadallprofiles()
  return all[name.trim()]
}
