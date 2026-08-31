import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediasubmiturl } from 'zss/feature/mediaqueue/mediasubmit'
import { mediaisqueueurl } from 'zss/feature/mediaqueue/urlnormalize'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { memorycanruncommand } from 'zss/memory/permissions'
import { memoryreadoperator } from 'zss/memory/session'
import { readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

const MEDIA_LOADER_USAGE = 'usage: #media <name> <url>'

/** Loader-only `#media <name> <url>` — submit with explicit queue display name. */
export const loadermedia: FIRMWARE_COMMAND = (_chip, words) => {
  const player = memoryreadoperator()
  const [name, iii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
  if (!name) {
    apierror(SOFTWARE, player, 'media', MEDIA_LOADER_USAGE)
    return 0
  }
  const [urlwords] = readargsuntilend(words, iii, ARG_TYPE.NUMBER_OR_STRING)
  const url = Array.isArray(urlwords)
    ? urlwords.join(' ')
    : String(urlwords ?? '')
  if (!url.trim() || !mediaisqueueurl(url)) {
    apierror(SOFTWARE, player, 'media', MEDIA_LOADER_USAGE)
    return 0
  }
  if (!memorycanruncommand(player, 'media')) {
    return 0
  }
  mediasubmiturl(player, { url, displayname: String(name) })
  return 0
}
