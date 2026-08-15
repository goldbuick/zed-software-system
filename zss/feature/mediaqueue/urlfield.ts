import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { maptostring } from 'zss/mapping/value'
import { NAME } from 'zss/words/types'

import {
  MEDIA_PEER_TARGET,
  MEDIA_SCROLL_CHIP,
  MEDIA_URL_TARGET,
} from './constants'

let drafturl = ''
let draftpeerid = ''

registerhyperlinksharedbridge(
  MEDIA_SCROLL_CHIP,
  'text',
  (_typ, name) => {
    const key = NAME(name)
    if (key === MEDIA_URL_TARGET) {
      return drafturl
    }
    if (key === MEDIA_PEER_TARGET) {
      return draftpeerid
    }
    return ''
  },
  (_typ, name, value) => {
    const key = NAME(name)
    if (key === MEDIA_URL_TARGET) {
      drafturl = maptostring(value)
    }
    if (key === MEDIA_PEER_TARGET) {
      draftpeerid = maptostring(value)
    }
  },
)

export function mediaqueuereaddrafturl(): string {
  return drafturl.trim()
}

export function mediaqueuecleardrafturl() {
  drafturl = ''
}

export function mediaqueuereaddraftpeerid(): string {
  return draftpeerid.trim()
}

export function mediaqueuecleardraftpeerid() {
  draftpeerid = ''
}
