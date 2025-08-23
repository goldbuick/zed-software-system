import { api_error, api_log, api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memorypickcodepagewithtype, memoryreadbookflags } from 'zss/memory'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'

export const DISPLAY_FIRMWARE = createfirmware()
  .command('toast', (_, words) => {
    const text = words.map(maptostring).join('')
    api_toast(SOFTWARE, READ_CONTEXT.elementfocus, text)
    return 0
  })
  .command('ticker', (_, words) => {
    const text = words.map(maptostring).join('')
    if (ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.tickertext = text
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
    }
    return 0
  })
  .command('palette', (_, words) => {
    const [target] = readargs(words, 0, [ARG_TYPE.NAME])
    const bookflags = memoryreadbookflags()
    const palette = memorypickcodepagewithtype(CODE_PAGE_TYPE.PALETTE, target)
    if (ispresent(palette)) {
      bookflags.palette = palette.id
      api_log(SOFTWARE, READ_CONTEXT.elementfocus, `loaded palette ${target}`)
    } else {
      api_error(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'not-found',
        `unabled to find palette ${target}`,
      )
    }
    return 0
  })
  .command('charset', (_, words) => {
    const [target] = readargs(words, 0, [ARG_TYPE.NAME])
    const bookflags = memoryreadbookflags()
    const charset = memorypickcodepagewithtype(CODE_PAGE_TYPE.CHARSET, target)
    if (ispresent(charset)) {
      bookflags.charset = charset.id
      api_log(SOFTWARE, READ_CONTEXT.elementfocus, `loaded charset ${target}`)
    } else {
      api_error(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        'not-found',
        `unabled to find charset ${target}`,
      )
    }
    return 0
  })
