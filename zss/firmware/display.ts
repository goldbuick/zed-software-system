import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { READ_CONTEXT } from 'zss/words/reader'

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
