import { vm_refscroll } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import {
  gadgetaddcenterpadding,
  gadgetcheckqueue,
  gadgetcheckset,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memorysendtoelements, memorysendtolog } from 'zss/memory/send'
import { READ_CONTEXT } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'

export const RUNTIME_FIRMWARE = createfirmware({
  set(chip, name, value) {
    // we monitor changes on shared values here
    gadgetcheckset(chip, name, value)
    // return has unhandled
    return [false, undefined]
  },
  aftertick(chip) {
    const queue = gadgetcheckqueue(READ_CONTEXT.elementid)
    const [ticker] = queue
    if (queue.length === 1 && isstring(ticker)) {
      if (ispresent(READ_CONTEXT.element)) {
        // empty ticker string clears sidebar
        if (ticker.trim().length === 0) {
          // player updating sidebar
          const shared = gadgetstate(READ_CONTEXT.elementid)
          shared.sidebar = []
        } else {
          READ_CONTEXT.element.tickertext = ticker
          READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
          // log text
          memorysendtolog(READ_CONTEXT.board, READ_CONTEXT.element, ticker)
        }
      }
    } else if (queue.length > 1) {
      if (READ_CONTEXT.elementisplayer) {
        // player updating sidebar
        const shared = gadgetstate(READ_CONTEXT.elementid)
        shared.sidebar = gadgetaddcenterpadding(queue)
      } else {
        // element scroll locks until we get scrollclear
        const player = READ_CONTEXT.elementfocus
        chip.scrolllock(player)
        // element sending a scroll to a player
        const shared = gadgetstate(player)
        shared.scrollname =
          READ_CONTEXT.element?.name ??
          READ_CONTEXT.element?.kinddata?.name ??
          ''
        shared.scroll = gadgetaddcenterpadding(queue)
      }
    }
  },
})
  .command('endgame', (chip) => {
    chip.set('health', 0)
    return 0
  })
  .command('shortsend', (chip, words) => {
    const send = parsesend(words)
    memorysendtoelements(chip, READ_CONTEXT.element, send)
    return 0
  })
  .command('send', (chip, words) => {
    const send = parsesend(words, true)
    memorysendtoelements(chip, READ_CONTEXT.element, send)
    return 0
  })
  .command('stat', () => {
    //  no-op
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join('')
    gadgettext(READ_CONTEXT.elementid, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    const [label, ...words] = args
    const labelstr = chip.template(maptostring(label).split(' '))
    const wordsstr = chip.template(words)
    // need to detect maybe flags in words
    gadgethyperlink(
      READ_CONTEXT.elementid,
      chip.id(),
      labelstr,
      wordsstr.split(' '),
      chip.get,
      chip.set,
    )
    return 0
  })
  .command('help', () => {
    vm_refscroll(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
