import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { maptostring } from 'zss/mapping/value'
import { NAME } from 'zss/words/types'

import { MEDIAQUEUE_SCROLL_CHIP, MEDIAQUEUE_URL_TARGET } from './constants'

let drafturl = ''

registerhyperlinksharedbridge(
  MEDIAQUEUE_SCROLL_CHIP,
  'text',
  (_typ, name) => {
    if (NAME(name) === MEDIAQUEUE_URL_TARGET) {
      return drafturl
    }
    return ''
  },
  (_typ, name, value) => {
    if (NAME(name) === MEDIAQUEUE_URL_TARGET) {
      drafturl = maptostring(value)
    }
  },
)

export function mediaqueuereaddrafturl(): string {
  return drafturl.trim()
}

export function mediaqueuecleardrafturl() {
  drafturl = ''
}
