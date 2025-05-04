import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import {
  gadgetcheckqueue,
  gadgetcheckset,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { createsid } from 'zss/mapping/guid'
import { totarget } from 'zss/mapping/string'
import { ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { listelementsbyattr } from 'zss/memory/atomics'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

export const RUNTIME_FIRMWARE = createfirmware({
  set(chip, name, value) {
    // we monitor changes on shared values here
    gadgetcheckset(chip, name, value)
    // return has unhandled
    return [false, undefined]
  },
  everytick() {
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
          // could we trigger sprite animations with ticker text ??
          // $WOBBLE $BOUNCE $SPIN
          READ_CONTEXT.element.tickertext = ticker
          READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
        }
      }
    } else if (queue.length > 1) {
      if (READ_CONTEXT.elementisplayer) {
        // player updating sidebar
        const shared = gadgetstate(READ_CONTEXT.elementid)
        shared.sidebar = queue
      } else {
        // element sending a scroll to a player
        const shared = gadgetstate(READ_CONTEXT.elementfocus)
        shared.scroll = queue
      }
    }
  },
})
  // primary firmware
  .command('send', (chip, words) => {
    const [msg, data] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])

    // determine target of send
    const [target, label] = totarget(msg)

    // the intent here is to gather a list of target chip ids
    const ltarget = NAME(target)
    switch (ltarget) {
      case 'all':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          chip.send(READ_CONTEXT.elementfocus, id, label, data)
        }
        break
      case 'self':
        chip.message({
          session: SOFTWARE.session(),
          player: READ_CONTEXT.elementfocus,
          id: createsid(),
          sender: chip.id(),
          target: label,
          data,
        })
        break
      case 'others':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          if (id !== chip.id()) {
            chip.send(READ_CONTEXT.elementfocus, id, label, data)
          }
        }
        break
      default: {
        // target named elements
        const elements = listelementsbyattr(READ_CONTEXT.board, [target])
        for (let i = 0; i < elements.length; ++i) {
          const element = elements[i]
          if (ispresent(element.id)) {
            chip.send(READ_CONTEXT.elementfocus, element.id, label, data)
          }
        }
        break
      }
    }
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
    // package into a panel item
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    gadgethyperlink(
      READ_CONTEXT.elementid,
      chip.id(),
      label,
      words,
      chip.get,
      chip.set,
    )
    return 0
  })
