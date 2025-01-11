import { api_error } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { PALETTE_RGB } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryensuresoftwarecodepage,
  memoryreadbookflags,
} from 'zss/memory'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { mapstrcolor, readstrcolor } from 'zss/words/color'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

export const DISPLAY_FIRMWARE = createfirmware()
  .command('palette', (_, words) => {
    const [target, ii] = readargs(words, 0, [ARG_TYPE.NAME])
    const bookflags = memoryreadbookflags()
    const maybestrcolor = mapstrcolor(NAME(target))
    if (ispresent(maybestrcolor)) {
      const maybecolor = readstrcolor([maybestrcolor]) as MAYBE<number>
      if (!ispresent(maybecolor)) {
        // todo raise error about bad color?
        return 0
      }
      const [r, g, b] = readargs(words, ii, [
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
      ])
      // read target palette to update
      const palette = memoryensuresoftwarecodepage(
        MEMORY_LABEL.MAIN,
        isstring(bookflags.palette) ? bookflags.palette : MEMORY_LABEL.MAIN,
        CODE_PAGE_TYPE.PALETTE,
      )
      const bytes = codepagereaddata<CODE_PAGE_TYPE.PALETTE>(palette)
      if (ispresent(bytes) && maybecolor >= 0 && maybecolor <= 16) {
        const row = maybecolor * PALETTE_RGB
        bytes.bits[row + 0] = clamp(r, 0, 63)
        bytes.bits[row + 1] = clamp(g, 0, 63)
        bytes.bits[row + 2] = clamp(b, 0, 63)
      }
      // ensure palette is active
      bookflags.palette = palette.id
    } else {
      const palette = bookreadcodepagewithtype(
        READ_CONTEXT.book,
        CODE_PAGE_TYPE.PALETTE,
        target,
      )
      if (ispresent(palette)) {
        bookflags.palette = palette.id
      } else {
        api_error('display', 'not-found', `unabled to find palette ${target}`)
      }
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
    } else {
      api_error('display', 'not-found', `unabled to find charset ${target}`)
    }
    return 0
  })
