import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import {
  gadgetcheckscroll,
  gadgetcheckset,
  gadgethyperlink,
  gadgetpanel,
  gadgettext,
} from 'zss/gadget/data/api'
import { PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { createsid } from 'zss/mapping/guid'
import { isarray, ispresent } from 'zss/mapping/types'
import { listelementsbyattr } from 'zss/memory/atomics'
import { bookelementdisplayread } from 'zss/memory/book'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { statformat } from 'zss/words/stats'
import { COLOR, NAME, STAT_TYPE } from 'zss/words/types'

export const GADGET_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set(chip, name, value) {
    // we monitor changes on shared values here
    gadgetcheckset(chip, name, value)
    // return has unhandled
    return [false, undefined]
  },
  tick() {
    const withname = READ_CONTEXT.element?.name ?? 'scroll'
    gadgetpanel(
      READ_CONTEXT.elementid,
      'scroll',
      PANEL_TYPE.SCROLL,
      undefined,
      withname,
    )
  },
  everytick() {
    const ticker = gadgetcheckscroll(READ_CONTEXT.elementid)
    if (ticker && ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.tickertext = ticker
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      // send message
      const display = bookelementdisplayread(
        READ_CONTEXT.book,
        READ_CONTEXT.element,
        1,
        COLOR.WHITE,
        COLOR.ONCLEAR,
      )
      tape_info(SOFTWARE, `$${COLOR[display.color]}$${display.char}`, ticker)
    }
  },
})
  // primary firmware
  .command('send', (chip, words) => {
    const [msg, data] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])

    // determine target of send
    const [maybetarget, maybelabel] = msg.split(':')

    const target = ispresent(maybelabel) ? maybetarget : 'self'
    const label = maybelabel ?? maybetarget

    function sendtoelements(elements: BOARD_ELEMENT[]) {
      elements.forEach((element) => {
        if (ispresent(element.id)) {
          chip.send(element.id, label, data)
        }
      })
    }

    // the intent here is to gather a list of target chip ids
    const ltarget = NAME(target)
    switch (ltarget) {
      case 'all':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          chip.send(id, label, data)
        }
        break
      case 'self':
        chip.message({
          session: SOFTWARE.session(),
          id: createsid(),
          sender: chip.id(),
          target: label,
          data,
        })
        break
      case 'others':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          if (id !== chip.id()) {
            chip.send(id, label, data)
          }
        }
        break
      default: {
        // check named elements first
        sendtoelements(listelementsbyattr(READ_CONTEXT.board, [target]))
        // check to see if its a flag
        const maybeattr = chip.get(ltarget)
        // check to see if array
        if (isarray(maybeattr)) {
          sendtoelements(listelementsbyattr(READ_CONTEXT.board, maybeattr))
        } else {
          sendtoelements(listelementsbyattr(READ_CONTEXT.board, [maybeattr]))
        }
        break
      }
    }
    return 0
  })
  .command('stat', (_, words) => {
    const stat = statformat(words.map(maptostring))
    switch (stat.type) {
      case STAT_TYPE.OBJECT:
        if (ispresent(READ_CONTEXT.element)) {
          READ_CONTEXT.element.name = stat.values.join(' ')
        }
        break
    }
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join('')
    gadgettext(READ_CONTEXT.elementid, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    gadgethyperlink(READ_CONTEXT.elementid, chip, label, input, words)
    return 0
  })
  // ---
  .command('gadget', (_, words) => {
    const [edge] = readargs(words, 0, [ARG_TYPE.NAME])
    const edgeConst = PANEL_TYPE_MAP[NAME(edge)]
    if (edgeConst === PANEL_TYPE.SCROLL) {
      const [name, size] = readargs(words, 1, [
        ARG_TYPE.MAYBE_NAME,
        ARG_TYPE.MAYBE_NUMBER,
      ])
      gadgetpanel(READ_CONTEXT.elementid, edge, edgeConst, size, name)
    } else if (ispresent(edgeConst)) {
      const [size, name] = readargs(words, 1, [
        ARG_TYPE.MAYBE_NUMBER,
        ARG_TYPE.MAYBE_NAME,
      ])
      gadgetpanel(READ_CONTEXT.elementid, edge, edgeConst, size, name)
    }
    return 0
  })
