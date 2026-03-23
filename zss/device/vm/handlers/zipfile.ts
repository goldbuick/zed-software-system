import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  markzipfilelistitem,
  readzipfilelist,
  readzipfilelistitem,
} from 'zss/feature/parse/file'
import { parsemarkdownforscroll } from 'zss/feature/parse/markdownscroll'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { NAME } from 'zss/words/types'

registerhyperlinksharedbridge(
  'zipfilelist',
  'select',
  (name) => (readzipfilelistitem(name) ? 1 : 0),
  (name, value) => markzipfilelistitem(name, !!value),
)

export function handlereadzipfilelist(_vm: DEVICE, message: MESSAGE): void {
  const list = readzipfilelist()
  const lines: string[] = []
  lines.push('$CENTER Select Files')
  lines.push('[import selected](importfiles)')
  for (let i = 0; i < list.length; ++i) {
    const [type, filename] = list[i]
    if (!type) {
      continue
    }
    lines.push(filename)
    const fname = NAME(filename)
    lines.push(`[\\[${type}\\]](<${fname} select NO 0 YES 1>)`)
  }
  parsemarkdownforscroll(
    message.player,
    lines.join('\n\n'),
    'zipfilelist',
    'zipfilelist',
  )
}
