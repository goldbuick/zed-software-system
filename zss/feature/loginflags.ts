import { CONFIG_KEYS, CONFIG_STRING_KEYS } from 'zss/feature/storagekeys'

const CONFIG_KEY_SET = new Set<string>(CONFIG_KEYS)
const CONFIG_STRING_KEY_SET = new Set<string>(CONFIG_STRING_KEYS)

/** Strip config keys before merging storage vars into book flags at login. */
export function sanitizeloginflags(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (CONFIG_KEY_SET.has(key)) {
      continue
    }
    if (CONFIG_STRING_KEY_SET.has(key)) {
      continue
    }
    if (key.startsWith('config_')) {
      continue
    }
    out[key] = value
  }
  return out
}
