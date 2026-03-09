import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  markzipfilelistitem,
  readzipfilelist,
  readzipfilelistitem,
} from 'zss/feature/parse/file'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { NAME, WORD } from 'zss/words/types'

export function handleReadzipfilelist(_vm: DEVICE, message: MESSAGE): void {
  const list = readzipfilelist()
  gadgettext(message.player, `$CENTER Select Files`)
  gadgethyperlink(message.player, 'zipfilelist', 'import selected', [
    'importfiles',
  ])
  for (let i = 0; i < list.length; ++i) {
    const [type, filename] = list[i]
    if (!type) {
      continue
    }
    gadgettext(message.player, filename)
    gadgethyperlink(
      message.player,
      'zipfilelist',
      `[${type}]`,
      [NAME(filename), 'select', 'NO', '0', 'YES', '1'],
      (name: string) => (readzipfilelistitem(name) ? 1 : 0),
      (name: string, value: WORD) => {
        markzipfilelistitem(name, !!value)
      },
    )
  }
  const shared = gadgetstate(message.player)
  shared.scrollname = 'zipfilelist'
  shared.scroll = gadgetcheckqueue(message.player)
}
