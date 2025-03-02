import { parsetarget } from 'zss/device'
import {
  gadgetserver_clearscroll,
  tape_editor_open,
  vm_codeaddress,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { writetext } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'
import { CATEGORY, PT } from 'zss/words/types'

import {
  boardelementread,
  boardelementreadbyidorindex,
  boardsetterrain,
} from './board'
import { boardelementname } from './boardelement'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookreadcodepagewithtype,
} from './book'
import { memoryinspectarea } from './inspectarea'
import {
  memoryinspectchar,
  memoryinspectcolor,
  memoryinspectelement,
} from './inspectelement'
import { CODE_PAGE_TYPE } from './types'

import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memoryreadbookbysoftware,
  memoryreadplayerboard,
} from '.'

const DIVIDER = '$yellow$205$205$205$196'

function ptstoarea(p1: PT, p2: PT) {
  return `${p1.x},${p1.y},${p2.x},${p2.y}`
}

export function memoryinspectempty(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  switch (mode) {
    case 'emptyall': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            bookboardsafedelete(
              mainbook,
              board,
              maybeobject,
              mainbook.timestamp,
            )
          }
          boardsetterrain(board, { x, y })
        }
      }
      break
    }
    case 'emptyobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            bookboardsafedelete(
              mainbook,
              board,
              maybeobject,
              mainbook.timestamp,
            )
          }
        }
      }
      break
    }
    case 'emptyterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          boardsetterrain(board, { x, y })
        }
      }
      break
    }
  }
}

export function memoryinspectemptymenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'clear terrain & objects', [
    `emptyall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'clear objects', [
    `emptyobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'clear terrain', [
    `emptyterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}

export function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  // ensure lookup
  bookboardsetlookup(mainbook, board)

  if (p1.x === p2.x && p1.y === p2.y) {
    const element = boardelementread(board, p1)
    if (ispresent(element)) {
      // figure out stats from kind codepage
      const terrainpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.TERRAIN,
        element.kind ?? '',
      )
      if (ispresent(terrainpage)) {
        memoryinspectelement(player, board, terrainpage, element, p1, false)
      }
      const objectpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.OBJECT,
        element.kind ?? '',
      )
      if (ispresent(objectpage)) {
        memoryinspectelement(player, board, objectpage, element, p1, true)
      }
    } else {
      gadgettext(player, `empty: ${p1.x}, ${p1.y}`)
      gadgettext(player, DIVIDER)
    }
  } else {
    memoryinspectarea(player, p1, p2)
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}

export function memoryinspectcommand(path: string, player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const inspect = parsetarget(path)
  const element = boardelementreadbyidorindex(board, inspect.target)
  if (!ispresent(element)) {
    return
  }
  switch (inspect.path) {
    case 'bg':
    case 'color':
      memoryinspectcolor(player, element, inspect.path)
      break
    case 'char':
      memoryinspectchar(player, element, inspect.path)
      break
    case 'code':
      doasync(SOFTWARE, async () => {
        if (!ispresent(player)) {
          return
        }

        const name = boardelementname(element)
        const pagetype = 'object'
        writetext(SOFTWARE, `opened [${pagetype}] ${name}`)

        // edit path
        const path = [board.id, element.id ?? '']

        // write to modem
        modemwriteinitstring(
          vm_codeaddress(mainbook.id, path),
          element.code ?? '',
        )

        // close scroll
        gadgetserver_clearscroll(SOFTWARE, player)

        // wait a little
        await waitfor(800)

        // open code editor
        tape_editor_open(
          SOFTWARE,
          mainbook.id,
          [board.id, element.id ?? ''],
          pagetype,
          `${name} - ${mainbook.name}`,
          player,
        )
      })
      break
    default:
      console.info('unknown inspect', inspect)
      break
  }
}
