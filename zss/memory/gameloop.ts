import { objectKeys } from 'ts-extras'
import { CHIP, senderid } from 'zss/chip'
import { MESSAGE, apichat } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { pttoindex } from 'zss/mapping/2d'
import { createsid, ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { ispt } from 'zss/words/dir'
import { READ_CONTEXT } from 'zss/words/reader'
import { SEND_META } from 'zss/words/send'
import { NAME, PT } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import {
  memoryboardelementread,
  memoryboardelementreadbyidorindex,
  memoryboardobjectread,
  memoryboardsafedelete,
  memoryboardtick,
} from './boardoperations'
import { memoryloaderarg } from './loader'
import { memorybookplayerreadboards } from './playermanagement'
import { memoryelementtologprefix } from './rendering'
import { memoryboardlistelementsbyidnameorpts } from './spatialqueries'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

import {
  memoryboardinit,
  memoryelementstatread,
  memorygetloaders,
  memoryreadbookbysoftware,
  memoryreadflags,
  memoryreadoperator,
} from './index'

// manages chips
const os = createos()

// Tick & Update Functions

export function memorytickobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
  code: string,
) {
  if (!ispresent(book) || !ispresent(board) || !ispresent(object)) {
    return
  }

  // cache context
  const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

  // write context
  READ_CONTEXT.book = book
  READ_CONTEXT.board = board
  READ_CONTEXT.element = object

  READ_CONTEXT.elementid = object.id ?? ''
  READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)

  const playerfromelement = READ_CONTEXT.element.player ?? memoryreadoperator()
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementisplayer
    ? READ_CONTEXT.elementid
    : playerfromelement

  // read cycle
  const cycle = memoryelementstatread(object, 'cycle')

  // run chip code
  const id = object.id ?? ''
  const itemname = NAME(object.name ?? object.kinddata?.name ?? '')
  os.tick(id, DRIVER_TYPE.RUNTIME, cycle, itemname, code)

  // clear ticker
  if (isnumber(object?.tickertime)) {
    // clear ticker text after X number of ticks
    if (READ_CONTEXT.timestamp - object.tickertime > TICK_FPS * 5) {
      object.tickertime = 0
      object.tickertext = ''
    }
  }

  // clear used input
  if (READ_CONTEXT.elementisplayer) {
    const flags = memoryreadflags(READ_CONTEXT.elementid)
    if (isnumber(flags.inputcurrent)) {
      flags.inputcurrent = 0
    }
  }

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
}

export function memorytick(playeronly = false) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // inc timestamp
  const timestamp = mainbook.timestamp + 1

  // update loaders
  const loaders = memorygetloaders()
  loaders.forEach((code, id) => {
    // cache context
    const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

    // write context, all blank except for book and timestamp
    READ_CONTEXT.timestamp = mainbook.timestamp
    READ_CONTEXT.book = mainbook
    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = memoryreadoperator()

    // set chip
    const maybearg = memoryloaderarg(id)
    if (ispresent(maybearg)) {
      os.arg(id, maybearg)
    }

    // run code
    os.tick(id, DRIVER_TYPE.LOADER, 1, 'loader', code)

    // teardown on ended
    if (os.isended(id)) {
      os.halt(id)
      loaders.delete(id)
    }

    // restore context
    objectKeys(OLD_CONTEXT).forEach((key) => {
      // @ts-expect-error dont bother me
      READ_CONTEXT[key] = OLD_CONTEXT[key]
    })
  })

  // track tick
  mainbook.timestamp = timestamp
  READ_CONTEXT.timestamp = timestamp

  // update boards / build code / run chips
  const boards = memorybookplayerreadboards(mainbook)
  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]
    // init kinds
    memoryboardinit(board)
    // iterate code needed to update given board
    const run = memoryboardtick(board, timestamp)
    for (let i = 0; i < run.length; ++i) {
      const { id, type, code, object } = run[i]
      if (type === CODE_PAGE_TYPE.ERROR) {
        // handle dead code
        os.halt(id)
        // in dev, we only run player objects
      } else if (!playeronly || ispid(object?.id ?? '')) {
        // handle active code
        memorytickobject(mainbook, board, object, code)
      }
    }
  }
}

// Messaging Functions

export function memorymessage(message: MESSAGE) {
  os.message(message)
}

export function memorysendtolog(
  board: MAYBE<string>,
  element: MAYBE<BOARD_ELEMENT>,
  text: string,
) {
  if (!ispresent(board) || !ispresent(element?.id)) {
    return
  }
  apichat(SOFTWARE, board, `${memoryelementtologprefix(element)}${text}`)
}

function playerpartyinteraction(
  fromelement: BOARD_ELEMENT,
  toelement: BOARD_ELEMENT,
) {
  const fromelementisplayer = ispid(fromelement.id)
  const fromelementpartyisplayer = ispid(fromelement.party ?? fromelement.id)
  const fromelementisobjecorscroll =
    fromelement.kind === 'object' || fromelement.kind === 'scroll'

  let fromelementplayer = ''
  if (fromelement.party && fromelementpartyisplayer) {
    fromelementplayer = fromelement.party
  }
  if (fromelementisplayer) {
    fromelementplayer = fromelement.id ?? ''
  }

  const toelementpartyisplayer = ispid(toelement.party ?? toelement.id)
  const toelementisobjectorscroll =
    toelement.kind === 'object' || toelement.kind === 'scroll'

  const sameparty =
    fromelementpartyisplayer === toelementpartyisplayer &&
    !toelementisobjectorscroll &&
    !fromelementisobjecorscroll

  return { sameparty, fromelementplayer }
}

export function memorysendtoelement(
  fromelement: MAYBE<BOARD_ELEMENT>,
  toelement: BOARD_ELEMENT,
  label: string,
) {
  if (!ispresent(READ_CONTEXT.board) || !ispresent(fromelement)) {
    return
  }

  let withlabel = label
  let withplayer = ''

  switch (label) {
    case 'shot': {
      const { sameparty, fromelementplayer } = playerpartyinteraction(
        fromelement,
        toelement,
      )
      if (sameparty && memoryboardelementisobject(toelement)) {
        withlabel = 'partyshot'
      } else {
        withplayer = fromelementplayer
      }
      break
    }
    case 'touch': {
      const { sameparty, fromelementplayer } = playerpartyinteraction(
        fromelement,
        toelement,
      )
      if (sameparty) {
        withlabel = 'bump'
      } else {
        withplayer = fromelementplayer
      }
      break
    }
  }

  // delete breakable elements if shot
  if (withlabel === 'shot' && memoryelementstatread(toelement, 'breakable')) {
    memoryboardsafedelete(READ_CONTEXT.board, toelement, READ_CONTEXT.timestamp)
  }

  // send message
  if (ispresent(toelement?.id)) {
    let senderidorindex = ''
    if (ispresent(fromelement?.id)) {
      senderidorindex = fromelement.id
    } else {
      senderidorindex = `${pttoindex(
        { x: fromelement.x ?? 0, y: fromelement.y ?? 0 },
        BOARD_WIDTH,
      )}`
    }
    memorymessage({
      id: createsid(),
      session: SOFTWARE.session(),
      player: withplayer,
      sender: senderidorindex,
      target: `${toelement.id}:${withlabel}`,
      data: undefined,
    })
  }
}

export function memorysendtoelements(
  chip: CHIP,
  fromelement: MAYBE<BOARD_ELEMENT>,
  send: SEND_META,
) {
  if (ispresent(send.targetname)) {
    const objectids = Object.keys(READ_CONTEXT.board?.objects ?? {})

    switch (send.targetname) {
      case 'all':
        for (let i = 0; i < objectids.length; ++i) {
          const id = objectids[i]
          const object = memoryboardobjectread(READ_CONTEXT.board, id)
          if (ispresent(object)) {
            memorysendtoelement(fromelement, object, send.label)
          }
        }
        break
      case 'others':
        for (let i = 0; i < objectids.length; ++i) {
          const id = objectids[i]
          const object = memoryboardobjectread(READ_CONTEXT.board, id)
          if (id !== chip.id() && ispresent(object)) {
            memorysendtoelement(fromelement, object, send.label)
          }
        }
        break
      case 'sender': {
        // sender info
        const sender = memoryboardelementreadbyidorindex(
          READ_CONTEXT.board,
          READ_CONTEXT.element?.sender ?? '',
        )
        if (ispresent(sender) && memoryboardelementisobject(sender)) {
          memorysendtoelement(fromelement, sender, send.label)
        }
        break
      }
      case 'self':
        // check if we are sending shot / bombed to a breakable
        if (READ_CONTEXT.elementid !== chip.id()) {
          // detect messages from run & runwith
          chip.send(
            READ_CONTEXT.elementfocus,
            READ_CONTEXT.elementid,
            send.label,
          )
        } else if (ispresent(READ_CONTEXT.element)) {
          memorysendtoelement(fromelement, READ_CONTEXT.element, send.label)
        }
        break
      case 'ping': {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        const boards = memorybookplayerreadboards(mainbook)
        memorysendtoboards('all', send.label, undefined, boards)
        break
      }
      default: {
        // target named elements
        const elements = memoryboardlistelementsbyidnameorpts(
          READ_CONTEXT.board,
          [send.targetname],
        )
        for (let i = 0; i < elements.length; ++i) {
          const element = elements[i]
          if (ispresent(element)) {
            memorysendtoelement(fromelement, element, send.label)
          }
        }
        break
      }
    }
  } else if (ispresent(send.targetdir)) {
    if (send.targetdir.targets.length) {
      for (let i = 0; i < send.targetdir.targets.length; ++i) {
        const element = memoryboardelementread(
          READ_CONTEXT.board,
          send.targetdir.targets[i],
        )
        if (ispresent(element)) {
          memorysendtoelement(fromelement, element, send.label)
        }
      }
    } else {
      const element = memoryboardelementread(
        READ_CONTEXT.board,
        send.targetdir.destpt,
      )
      if (ispresent(element)) {
        memorysendtoelement(fromelement, element, send.label)
      }
    }
  }
}

export function memorysendtoboards(
  target: string | PT,
  message: string,
  data: any,
  boards: BOARD[],
) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  function sendtoelements(elements: BOARD_ELEMENT[]) {
    for (let i = 0; i < elements.length; ++i) {
      const element = elements[i]
      if (ispresent(element.id)) {
        const chipmessage = `${senderid(element.id)}:${message}`
        SOFTWARE.emit('', chipmessage, data)
      }
    }
  }

  if (ispt(target)) {
    for (let b = 0; b < boards.length; ++b) {
      const board = boards[b]
      const element = memoryboardelementread(board, target)
      if (ispresent(element)) {
        sendtoelements([element])
      }
    }
    return
  }

  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]

    // the intent here is to gather a list of target chip ids
    const ltarget = NAME(target)
    switch (ltarget) {
      case 'all':
      case 'self':
      case 'others': {
        sendtoelements(Object.values(board.objects))
        break
      }
      default: {
        // check named elements first
        sendtoelements(memoryboardlistelementsbyidnameorpts(board, [target]))
        break
      }
    }
  }
}
