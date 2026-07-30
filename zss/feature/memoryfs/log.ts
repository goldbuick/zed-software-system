import { apilog } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import { memoryreadconfig } from 'zss/memory/utilities'

const PATH_SAMPLE_LIMIT = 8

/** True when `#admin` config memoryfslogging is on. */
export function memoryfsloggingenabled(): boolean {
  return memoryreadconfig('memoryfslogging') === 'on'
}

export function memoryfspathsample(
  paths: string[],
  limit = PATH_SAMPLE_LIMIT,
): string {
  if (paths.length === 0) {
    return ''
  }
  const shown = paths.slice(0, limit)
  const more = paths.length > limit ? ` +${paths.length - limit} more` : ''
  return ` ${shown.join(' ')}${more}`
}

/** Always log a short sync line to the tape. */
export function memoryfslog(
  device: DEVICELIKE,
  player: string,
  line: string,
): void {
  apilog(device, player, `memoryfs ${line}`)
}

/** Path detail only when memoryfslogging is on. */
export function memoryfslogverbose(
  device: DEVICELIKE,
  player: string,
  line: string,
): void {
  if (!memoryfsloggingenabled()) {
    return
  }
  apilog(device, player, `memoryfs ${line}`)
}
