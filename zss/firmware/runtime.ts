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
import { memoryelementstatread } from 'zss/memory'
import { listelementsbyidnameorpts } from 'zss/memory/atomics'
import {
  boardelementread,
  boardobjectread,
  boardsafedelete,
} from 'zss/memory/board'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { SEND_META, parsesend } from 'zss/words/send'

function handlesendelement(chip: CHIP, element: BOARD_ELEMENT, label: string) {
  if (!ispresent(READ_CONTEXT.board)) {
    return
  }
  switch (label) {
    case 'shot':
    case 'bombed':
      if (memoryelementstatread(element, 'breakable')) {
        boardsafedelete(READ_CONTEXT.board, element, READ_CONTEXT.timestamp)
      }
      break
  }
  if (ispresent(element?.id)) {
    chip.send(READ_CONTEXT.elementfocus, element.id, label)
  }
}

function handlesend(chip: CHIP, send: SEND_META) {
  if (ispresent(send.targetname)) {
    const objectids = Object.keys(READ_CONTEXT.board?.objects ?? {})
    switch (send.targetname) {
      case 'all':
        for (let i = 0; i < objectids.length; ++i) {
          const id = objectids[i]
          const object = boardobjectread(READ_CONTEXT.board, id)
          if (ispresent(object)) {
            handlesendelement(chip, object, send.label)
          }
        }
        break
      case 'others':
        for (let i = 0; i < objectids.length; ++i) {
          const id = objectids[i]
          const object = boardobjectread(READ_CONTEXT.board, id)
          if (id !== chip.id() && ispresent(object)) {
            handlesendelement(chip, object, send.label)
          }
        }
        break
      case 'self':
        // check if we are sending shot / bombed to a breakable
        if (READ_CONTEXT.elementid !== chip.id()) {
          // detect messages from run & runwith
          chip.send(
            READ_CONTEXT.elementfocus,
            READ_CONTEXT.elementid,
            send.label,
          )
        } else {
          chip.message({
            session: SOFTWARE.session(),
            player: READ_CONTEXT.elementfocus,
            id: createsid(),
            sender: READ_CONTEXT.elementid,
            target: send.label,
          })
        }
        break
      default: {
        // target named elements
        const elements = listelementsbyidnameorpts(READ_CONTEXT.board, [
          send.targetname,
        ])
        for (let i = 0; i < elements.length; ++i) {
          const element = elements[i]
          if (ispresent(element)) {
            handlesendelement(chip, element, send.label)
          }
        }
        break
      }
    }
  } else if (ispresent(send.targetdir)) {
    if (send.targetdir.targets.length) {
      for (let i = 0; i < send.targetdir.targets.length; ++i) {
        const element = boardelementread(
          READ_CONTEXT.board,
          send.targetdir.targets[i],
        )
        if (ispresent(element)) {
          handlesendelement(chip, element, send.label)
        }
      }
    } else {
      const element = boardelementread(
        READ_CONTEXT.board,
        send.targetdir.destpt,
      )
      if (ispresent(element)) {
        handlesendelement(chip, element, send.label)
      }
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
  aftertick() {
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
    handlesend(chip, send)
    return 0
  })
  .command('send', (chip, words) => {
    const send = parsesend(words, true)
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
