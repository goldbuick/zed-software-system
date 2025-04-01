import { api_error, tape_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memoryreadbookflags } from 'zss/memory'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'

export const DISPLAY_FIRMWARE = createfirmware()
  .command('toast', (_, words) => {
    const text = words.map(maptostring).join('')
    tape_toast(SOFTWARE, text)
    return 0
  })
  .command('palette', (_, words) => {
    const [target] = readargs(words, 0, [ARG_TYPE.NAME])
    const bookflags = memoryreadbookflags()
    const palette = bookreadcodepagewithtype(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.PALETTE,
      target,
    )
    if (ispresent(palette)) {
      bookflags.palette = palette.id
      write(SOFTWARE, `loaded palette ${target}`)
    } else {
      api_error(SOFTWARE, 'not-found', `unabled to find palette ${target}`)
    }
    return 0
  })
  .command('charset', (_, words) => {
    const [target] = readargs(words, 0, [ARG_TYPE.NAME])
    const bookflags = memoryreadbookflags()
    const charset = bookreadcodepagewithtype(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.CHARSET,
      target,
    )
    if (ispresent(charset)) {
      bookflags.charset = charset.id
      write(SOFTWARE, `loaded charset ${target}`)
    } else {
      api_error(SOFTWARE, 'not-found', `unabled to find charset ${target}`)
    }
    return 0
  })
