import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { kickzedcafepoll } from 'zss/device/wanixclient/wanixzedcafe'
import { ispresent } from 'zss/mapping/types'

function readdirtypaths(data: unknown): string[] | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const paths = (data as { paths?: unknown }).paths
  if (!Array.isArray(paths)) {
    return undefined
  }
  return paths.filter((path): path is string => typeof path === 'string')
}

/** Iframe RESULT — guest export FS dirty; kick import cycle. */
export function handlezedcafefilechange(
  _device: DEVICE,
  message: MESSAGE,
): void {
  kickzedcafepoll('file-change', readdirtypaths(message.data))
}
