import { apitoast, type DEVICELIKE } from 'zss/device/api'
import { waitfor } from 'zss/mapping/tick'

/** Main-thread URL bookmark open: toast, delay, then assign `location` (register `bookmark:urlnavigate`). */
export async function runbookmarkurlnavigate(
  device: DEVICELIKE,
  player: string,
  href: string,
): Promise<void> {
  apitoast(device, player, `navigating to $green${href}`)
  await waitfor(2000)
  window.location.href = href.trim()
}
