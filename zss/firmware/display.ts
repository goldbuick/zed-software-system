import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memorysendtolog } from 'zss/memory/send'
import { READ_CONTEXT } from 'zss/words/reader'

export const DISPLAY_FIRMWARE = createfirmware()
  .command('toast', (_, words) => {
    const text = words.map(maptostring).join('')
    apitoast(SOFTWARE, READ_CONTEXT.elementfocus, text)
    return 0
  })
  .command('ticker', (_, words) => {
    const text = words.map(maptostring).join('')
    if (ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.tickertext = text
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      // log text
      memorysendtolog(READ_CONTEXT.board?.id, READ_CONTEXT.element, text)
    }
    return 0
  })
