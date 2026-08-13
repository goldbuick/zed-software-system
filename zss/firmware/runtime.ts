import type { CHIP } from 'zss/chip'
import {
  apierror,
  apitoast,
  gadgetclientbonk,
  gadgetclientfadein,
  gadgetclientfadeout,
  gadgetclientzap,
  vmrefscroll,
} from 'zss/device/api'
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
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memorysendtoelements } from 'zss/memory/gamesend'
import { memoryreadboardelementruntime } from 'zss/memory/runtimeboundary'
import { memoryreadoperator } from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT, readargsuntilend } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'
import {
  hasbonk,
  hasfadein,
  hasfadeout,
  hasticker,
  hastoast,
  haszap,
  stripbonk,
  stripfadein,
  stripfadeout,
  stripzap,
} from 'zss/words/textformat'
import { ARG_TYPE } from 'zss/words/types'

export type TICK_READ_CONTEXT = {
  board: MAYBE<BOARD>
  element: MAYBE<BOARD_ELEMENT>
  elementid: string
  elementfocus: string
  elementisplayer: boolean
}

let tickreadcontextcache: MAYBE<TICK_READ_CONTEXT>

function bindtickreadcontext(ctx: TICK_READ_CONTEXT) {
  tickreadcontextcache = ctx
}

export function cleartickreadcontext() {
  tickreadcontextcache = undefined
}

export function readtickreadcontext(): TICK_READ_CONTEXT {
  if (!ispresent(tickreadcontextcache)) {
    const player = READ_CONTEXT.elementfocus || memoryreadoperator()
    apierror(
      SOFTWARE,
      player,
      'runtime',
      'readtickreadcontext without everytick bind',
    )
    throw new Error('readtickreadcontext without everytick bind')
  }
  return tickreadcontextcache
}

function asserttickreadcontextinvariant(
  ctx: TICK_READ_CONTEXT,
  queuelength: number,
) {
  if (
    queuelength > 1 &&
    !ctx.elementisplayer &&
    ispresent(ctx.board) &&
    ispresent(ctx.element) &&
    ctx.board.objects[ctx.elementfocus] === ctx.element
  ) {
    apierror(
      SOFTWARE,
      ctx.elementfocus,
      'runtime',
      'aftertick: elementisplayer false but element is focus board object',
    )
  }
}

function aftertickfromcontext(chip: CHIP) {
  const ctx = readtickreadcontext()
  try {
    const queue = gadgetcheckqueue(ctx.elementid)
    const [ticker] = queue
    asserttickreadcontextinvariant(ctx, queue.length)
    if (queue.length === 1 && isstring(ticker)) {
      if (ispresent(ctx.element)) {
        // empty ticker string clears sidebar
        if (ticker.trim().length === 0) {
          const shared = gadgetstate(ctx.elementid)
          shared.sidebar = []
        } else {
          ctx.element.tickertext = ticker
          ctx.element.tickertime = READ_CONTEXT.timestamp
        }
      }
    } else if (queue.length > 1) {
      if (ctx.elementisplayer) {
        const shared = gadgetstate(ctx.elementid)
        shared.sidebar = gadgetaddcenterpadding(queue)
      } else {
        const player = ctx.elementfocus
        chip.scrolllock(player)
        const shared = gadgetstate(player)
        const kinddata = memoryreadboardelementruntime(ctx.element)?.kinddata
        shared.scrollname =
          ctx.element?.displayname ??
          kinddata?.displayname ??
          ctx.element?.name ??
          kinddata?.name ??
          ''
        shared.scroll = gadgetaddcenterpadding(queue)
      }
    }
  } finally {
    cleartickreadcontext()
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
    bindtickreadcontext({
      board: READ_CONTEXT.board,
      element: READ_CONTEXT.element,
      elementid: READ_CONTEXT.elementid,
      elementfocus: READ_CONTEXT.elementfocus,
      elementisplayer: READ_CONTEXT.elementisplayer,
    })
  },
  aftertick(chip) {
    aftertickfromcontext(chip)
  },
})
  .command('endgame', ['health to 0'], (chip) => {
    chip.set('health', 0)
    return 0
  })
  .command(
    'shortsend',
    ['message (short form, no target keyword needed)'],
    (chip, words) => {
      const send = parsesend(words)
      memorysendtoelements(chip, READ_CONTEXT.element, send)
      return 0
    },
  )
  .command('send', ['message to target elements'], (chip, words) => {
    const send = parsesend(words, true)
    memorysendtoelements(chip, READ_CONTEXT.element, send)
    return 0
  })
  .command('stat', ['text in a scroll window'], () => {
    //  no-op
    return 0
  })
  .command('text', ['text on element or in sidebar'], (_, words) => {
    const [textwords] = readargsuntilend(words, 0, ARG_TYPE.NUMBER_OR_NAME)
    let text = textwords.join(' ')

    if (hasbonk(text)) {
      gadgetclientbonk(SOFTWARE, READ_CONTEXT.elementfocus)
      text = stripbonk(text)
    }
    if (haszap(text)) {
      gadgetclientzap(SOFTWARE, READ_CONTEXT.elementfocus)
      text = stripzap(text)
    }
    if (hasfadeout(text)) {
      gadgetclientfadeout(SOFTWARE, READ_CONTEXT.elementfocus)
      text = stripfadeout(text)
    }
    if (hasfadein(text)) {
      gadgetclientfadein(SOFTWARE, READ_CONTEXT.elementfocus)
      text = stripfadein(text)
    }

    let diverted = false

    const toasttext = hastoast(text)
    if (ispresent(toasttext)) {
      apitoast(SOFTWARE, READ_CONTEXT.elementfocus, toasttext)
      text = toasttext
      diverted = true
    }

    const tickertext = hasticker(text)
    if (ispresent(tickertext) && ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.tickertext = tickertext
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      diverted = true
    }

    if (diverted) {
      return 0
    }

    gadgettext(READ_CONTEXT.elementid, text)
    return 0
  })
  .command('hyperlink', ['clickable link in scroll or log'], (chip, args) => {
    const [label, ...words] = args
    const labelstr = chip.template(maptostring(label).split(' '))
    const wordsstr = chip.template(words)
    // need to detect maybe flags in words
    gadgethyperlink(
      READ_CONTEXT.elementid,
      chip.id(),
      labelstr,
      wordsstr.split(' '),
      (_typ, name) => chip.get(name),
      (_typ, name, value) => {
        chip.set(name, value)
      },
    )
    return 0
  })
  .command('help', ['help scroll'], () => {
    vmrefscroll(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
