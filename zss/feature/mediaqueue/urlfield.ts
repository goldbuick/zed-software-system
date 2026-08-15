import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { maptostring } from 'zss/mapping/value'
import { NAME } from 'zss/words/types'

import { MEDIA_SCROLL_CHIP, MEDIA_URL_TARGET } from './constants'

let drafturl = ''

registerhyperlinksharedbridge(
  MEDIA_SCROLL_CHIP,
  'text',
  (_typ, name) => {
    const key = NAME(name)
    if (key === MEDIA_URL_TARGET) {
      return drafturl
    }
    return ''
  },
  (_typ, name, value) => {
    const key = NAME(name)
    if (key === MEDIA_URL_TARGET) {
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
