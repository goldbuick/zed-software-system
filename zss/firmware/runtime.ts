import { vmrefscroll } from 'zss/device/api'
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
import { memorysendtoelements, memorysendtolog } from 'zss/memory/gamesend'
import { READ_CONTEXT, readargsuntilend } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'
import { ARG_TYPE } from 'zss/words/types'

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
          memorysendtolog(READ_CONTEXT.board?.id, READ_CONTEXT.element, ticker)
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
  .command('endgame', ['health to 0'], (chip) => {
    chip.set('health', 0)
    return 0
  })
  .command(
    'shortsend',
    [ARG_TYPE.ANY, ARG_TYPE.ANY, 'label and message (no TO keyword)'],
    (chip, words) => {
      const send = parsesend(words)
      memorysendtoelements(chip, READ_CONTEXT.element, send)
      return 0
    },
  )
  .command(
    'send',
    [ARG_TYPE.NAME, ARG_TYPE.ANY, 'target label and message'],
    (chip, words) => {
      const send = parsesend(words, true)
      memorysendtoelements(chip, READ_CONTEXT.element, send)
      return 0
    },
  )
  .command(
    'stat',
    [ARG_TYPE.NUMBER_OR_NAME, ARG_TYPE.ANY, 'optional line or name, then scroll text'],
    () => {
      //  no-op
      return 0
    },
  )
  .command(
    'text',
    [ARG_TYPE.NUMBER_OR_NAME, ARG_TYPE.ANY, 'optional line or name, then ticker text'],
    (_, words) => {
      const [textwords] = readargsuntilend(words, 0, ARG_TYPE.NUMBER_OR_NAME)
      const text = textwords.join(' ')
      gadgettext(READ_CONTEXT.elementid, text)
      return 0
    },
  )
  .command(
    'hyperlink',
    [ARG_TYPE.ANY, ARG_TYPE.ANY, 'label text and link target words'],
    (chip, args) => {
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
    },
  )
  .command('help', ['help scroll'], () => {
    vmrefscroll(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
