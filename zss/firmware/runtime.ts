import { CHIP } from 'zss/chip'
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
import { createsid } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { listelementsbyidnameorpts } from 'zss/memory/atomics'
import { boardelementread } from 'zss/memory/board'
import { READ_CONTEXT } from 'zss/words/reader'
import { parsesend, SEND_META } from 'zss/words/send'

function handlesend(chip: CHIP, send: SEND_META) {
  if (ispresent(send.targetname)) {
    switch (send.targetname) {
      case 'all':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          chip.send(READ_CONTEXT.elementfocus, id, send.label)
        }
        break
      case 'self':
        chip.message({
          session: SOFTWARE.session(),
          player: READ_CONTEXT.elementfocus,
          id: createsid(),
          sender: chip.id(),
          target: send.label,
        })
        break
      case 'others':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          if (id !== chip.id()) {
            chip.send(READ_CONTEXT.elementfocus, id, send.label)
          }
        }
        break
      default: {
        // target named elements
        const elements = listelementsbyidnameorpts(READ_CONTEXT.board, [
          send.targetname,
        ])
        for (let i = 0; i < elements.length; ++i) {
          const element = elements[i]
          if (ispresent(element.id)) {
            chip.send(READ_CONTEXT.elementfocus, element.id, send.label)
          }
        }
        break
      }
    }
  } else if (ispresent(send.targetdir)) {
    const element = boardelementread(READ_CONTEXT.board, send.targetdir.destpt)
    if (ispresent(element?.id)) {
      chip.send(READ_CONTEXT.elementfocus, element.id, send.label)
    }
  }
}

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
        shared.sidebar = gadgetaddcenterpadding(queue)
      } else {
        // element sending a scroll to a player
        const shared = gadgetstate(READ_CONTEXT.elementfocus)
        shared.scroll = gadgetaddcenterpadding(queue)
      }
    }
  },
})
  .command('shortsend', (chip, words) => {
    const send = parsesend(words)
    handlesend(chip, send)
    return 0
  })
  .command('send', (chip, words) => {
    const send = parsesend(['send', ...words])
    handlesend(chip, send)
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
    const [linkword, ...words] = args
    const linktext = maptostring(linkword)
    const send = parsesend(words)
    if (ispresent(send.targetname)) {
      gadgethyperlink(
        READ_CONTEXT.elementid,
        chip.id(),
        linktext,
        `${send.targetname}:${send.label}`.split(' '),
        chip.get,
        chip.set,
      )
    }
    return 0
  })
