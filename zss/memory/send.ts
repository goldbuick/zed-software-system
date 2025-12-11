import { LowpassCombFilter } from 'tone'
import { CHIP } from 'zss/chip'
import { SOFTWARE } from 'zss/device/session'
import { pttoindex } from 'zss/mapping/2d'
import { createsid, ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryelementstatread,
  memorymessage,
  memoryreadbookbysoftware,
  memorysendtoboards,
} from 'zss/memory'
import { listelementsbyidnameorpts } from 'zss/memory/atomics'
import {
  boardelementread,
  boardelementreadbyidorindex,
  boardobjectread,
  boardsafedelete,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { bookplayerreadboards } from 'zss/memory/bookplayer'
import { BOARD_ELEMENT, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { SEND_META } from 'zss/words/send'

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
      if (sameparty && boardelementisobject(toelement)) {
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
    boardsafedelete(READ_CONTEXT.board, toelement, READ_CONTEXT.timestamp)
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
          const object = boardobjectread(READ_CONTEXT.board, id)
          if (ispresent(object)) {
            memorysendtoelement(fromelement, object, send.label)
          }
        }
        break
      case 'others':
        for (let i = 0; i < objectids.length; ++i) {
          const id = objectids[i]
          const object = boardobjectread(READ_CONTEXT.board, id)
          if (id !== chip.id() && ispresent(object)) {
            memorysendtoelement(fromelement, object, send.label)
          }
        }
        break
      case 'sender': {
        // sender info
        const sender = boardelementreadbyidorindex(
          READ_CONTEXT.board,
          READ_CONTEXT.element?.sender ?? '',
        )
        if (ispresent(sender) && boardelementisobject(sender)) {
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
        const boards = bookplayerreadboards(mainbook)
        memorysendtoboards('all', send.label, undefined, boards)
        break
      }
      default: {
        // target named elements
        const elements = listelementsbyidnameorpts(READ_CONTEXT.board, [
          send.targetname,
        ])
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
        const element = boardelementread(
          READ_CONTEXT.board,
          send.targetdir.targets[i],
        )
        if (ispresent(element)) {
          memorysendtoelement(fromelement, element, send.label)
        }
      }
    } else {
      const element = boardelementread(
        READ_CONTEXT.board,
        send.targetdir.destpt,
      )
      if (ispresent(element)) {
        memorysendtoelement(fromelement, element, send.label)
      }
    }
  }
}
