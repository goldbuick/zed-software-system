import {
  storagewriteconfig,
  storagewriteconfigstring,
  storagewritevar,
} from 'zss/feature/storage'
import { isconfigstringkey } from 'zss/feature/storagekeys'

/** Route persisted keys the same way register:store did (config_* vs vars blob). */
export async function storagewritekey(
  name: string,
  value: unknown,
): Promise<void> {
  if (typeof name === 'string' && name.startsWith('config_')) {
    const keyname = name.slice(7)
    if (isconfigstringkey(keyname)) {
      await storagewriteconfigstring(
        keyname,
        String((value ?? '') as string | number),
      )
    } else {
      await storagewriteconfig(
        keyname,
        String((value ?? 'off') as string | number),
      )
    }
    return
  }
  await storagewritevar(name, value)
}
