import { apierror, bridgemediapanel } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediapayloadwithboardhelper } from 'zss/feature/mediaqueue/mediaguards'
import { mediaisqueueurl } from 'zss/feature/mediaqueue/urlnormalize'
import { FIRMWARE } from 'zss/firmware'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

/** `#media` queue list; `#media <url>` submits a URL. */
export function registermediacommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'media',
    [ARG_TYPE.MAYBE_NAME, 'Board TV media queue list or URL submit'],
    (_, words) => {
      const [first, iii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!first) {
        const payload = mediapayloadwithboardhelper(player)
        if (!payload) {
          return 0
        }
        bridgemediapanel(SOFTWARE, player, 'menu', payload)
        return 0
      }
      if (!mediaisqueueurl(String(first))) {
        apierror(SOFTWARE, player, 'media', 'usage: #media <url>')
        return 0
      }
      const [urlwords] = readargsuntilend(
        words,
        iii - 1,
        ARG_TYPE.NUMBER_OR_STRING,
      )
      const url = Array.isArray(urlwords)
        ? urlwords.join(' ')
        : String(urlwords ?? '')
      const payload = mediapayloadwithboardhelper(player, { url })
      if (!payload) {
        return 0
      }
      bridgemediapanel(SOFTWARE, player, 'add', payload)
      return 0
    },
  )
}
