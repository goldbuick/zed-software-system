import { CHIP, senderid } from 'zss/chip'
import { apichat } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { pttoindex } from 'zss/mapping/2d'
import { createsid, ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import { READ_CONTEXT } from 'zss/words/reader'
import { SEND_META } from 'zss/words/send'
import { NAME, PT } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import {
  memoryreadelement,
  memoryreadelementbyidorindex,
  memoryreadobject,
  memorysafedeleteelement,
} from './boardoperations'
import { memoryreadbookplayerboards } from './playermanagement'
import { memoryelementtologprefix } from './rendering'
import { memorymessagechip } from './runtime'
import { memorylistboardelementsbyidnameorpts } from './spatialqueries'
import { BOARD, BOARD_ELEMENT, BOARD_WIDTH, MEMORY_LABEL } from './types'

import { memoryreadbookbysoftware, memoryreadelementstat } from './index'

// Game Message Functions

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
      const element = memoryreadelement(board, target)
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
        sendtoelements(memorylistboardelementsbyidnameorpts(board, [target]))
        break
      }
    }
  }
}

export function memorysendtoelement(
  fromelement: MAYBE<BOARD_ELEMENT>,
  toelement: BOARD_ELEMENT,
  label: string,
) {
  if (!ispresent(READ_CONTEXT.board) || !ispresent(fromelement)) {
    return
  }

  const isfromplayer = ispid(fromelement.id)
  const istoplayer = ispid(toelement.id)

  let withlabel = label
  // if a player is sending a message, dest elements get aggro if they are not a player
  let withplayer = isfromplayer && !istoplayer ? fromelement.id : ''

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
  if (withlabel === 'shot' && memoryreadelementstat(toelement, 'breakable')) {
    memorysafedeleteelement(
      READ_CONTEXT.board,
      toelement,
      READ_CONTEXT.timestamp,
    )
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
    memorymessagechip({
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
          const object = memoryreadobject(READ_CONTEXT.board, id)
          if (ispresent(object)) {
            memorysendtoelement(fromelement, object, send.label)
          }
        }
        break
      case 'others':
        for (let i = 0; i < objectids.length; ++i) {
          const id = objectids[i]
          const object = memoryreadobject(READ_CONTEXT.board, id)
          if (id !== chip.id() && ispresent(object)) {
            memorysendtoelement(fromelement, object, send.label)
          }
        }
        break
      case 'sender': {
        // sender info
        const sender = memoryreadelementbyidorindex(
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
        const boards = memoryreadbookplayerboards(mainbook)
        memorysendtoboards('all', send.label, undefined, boards)
        break
      }
      default: {
        // target named elements
        const elements = memorylistboardelementsbyidnameorpts(
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
        const element = memoryreadelement(
          READ_CONTEXT.board,
          send.targetdir.targets[i],
        )
        if (ispresent(element)) {
          memorysendtoelement(fromelement, element, send.label)
        }
      }
    } else {
      const element = memoryreadelement(
        READ_CONTEXT.board,
        send.targetdir.destpt,
      )
      if (ispresent(element)) {
        memorysendtoelement(fromelement, element, send.label)
      }
    }
  }
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
