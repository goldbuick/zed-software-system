import { apierror, bridgemediapanel } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediapayloadwithboardhelper } from 'zss/feature/mediaqueue/mediaguards'
import { mediaisqueueurl } from 'zss/feature/mediaqueue/urlnormalize'
import { isstring } from 'zss/mapping/types'

export type MEDIA_SUBMIT_OPTIONS = {
  url: string
  displayname?: string
}

/**
 * VM-thread `#media` URL submit. Builds board-helper payload and emits
 * `bridge:mediapanel` add. Optional displayname overrides player flag name.
 * Returns false when url invalid or board has no helper (apierror already fired).
 */
export function mediasubmiturl(
  player: string,
  options: MEDIA_SUBMIT_OPTIONS,
): boolean {
  const url = isstring(options.url) ? options.url.trim() : ''
  if (!mediaisqueueurl(url)) {
    apierror(SOFTWARE, player, 'media', 'usage: #media <url>')
    return false
  }
  const data: Record<string, unknown> = { url }
  if (isstring(options.displayname)) {
    data.displayname = options.displayname
  }
  const payload = mediapayloadwithboardhelper(player, data)
  if (!payload) {
    return false
  }
  bridgemediapanel(SOFTWARE, player, 'add', payload)
  return true
}
