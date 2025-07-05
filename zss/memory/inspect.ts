import { parsetarget } from 'zss/device'
import {
  api_log,
  gadgetserver_clearscroll,
  register_copy,
  register_editor_open,
  vm_codeaddress,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { DIVIDER } from 'zss/feature/writeui'
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
  boardsafedelete,
  boardsetterrain,
} from './board'
import { boardelementisobject, boardelementname } from './boardelement'
import { boardsetlookup } from './boardlookup'
import { bookboardelementreadcodepage } from './book'
import { memoryinspectarea } from './inspectarea'
import { hassecretheap } from './inspectcopypaste'
import {
  memoryinspectchar,
  memoryinspectcolor,
  memoryinspectelement,
} from './inspectelement'

import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memoryreadbookbysoftware,
  memoryreadoperator,
  memoryreadplayerboard,
} from '.'

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
            boardsafedelete(board, maybeobject, mainbook.timestamp)
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
            boardsafedelete(board, maybeobject, mainbook.timestamp)
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
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

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

export async function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  const showpaste = await hassecretheap()
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  // ensure lookup
  boardsetlookup(board)

  // one element, or many ?
  if (p1.x === p2.x && p1.y === p2.y) {
    const element = boardelementread(board, p1)
    const codepage = bookboardelementreadcodepage(mainbook, element)
    // found element def
    if (ispresent(element) && ispresent(codepage)) {
      memoryinspectelement(
        player,
        board,
        codepage,
        element,
        p1,
        boardelementisobject(element),
      )
    }
    // most likely empty
    if (!element?.kind) {
      gadgettext(player, `empty: ${p1.x}, ${p1.y}`)
      gadgettext(player, DIVIDER)
      gadgethyperlink(player, 'empty', 'copy coords', [
        `copycoords:${p1.x},${p1.y}`,
        'hk',
        '5',
        ` 5 `,
      ])
      gadgethyperlink(player, 'batch', `edit @board codepage`, [
        `pageopen:${board.id}`,
      ])

      // easy to copy board id
      gadgethyperlink(player, 'batch', `board id ${board.id}`, [
        '',
        'copyit',
        board.id,
      ])
    }
  } else {
    memoryinspectarea(player, p1, p2, showpaste)
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
    case 'copycoords':
      register_copy(
        SOFTWARE,
        memoryreadoperator(),
        [element.x ?? 0, element.y ?? 0].join(' '),
      )
      break
    case 'bg':
    case 'color':
      memoryinspectcolor(player, element, inspect.path)
      break
    case 'char':
      memoryinspectchar(player, element, inspect.path)
      break
    case 'empty':
      boardsafedelete(board, element, mainbook.timestamp)
      break
    case 'code':
      doasync(SOFTWARE, player, async () => {
        const name = boardelementname(element)
        const pagetype = 'object'
        api_log(SOFTWARE, player, `opened [${pagetype}] ${name}`)

        // edit path
        const path = [board.id, element.id]

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
        register_editor_open(
          SOFTWARE,
          player,
          mainbook.id,
          path,
          pagetype,
          `${name} - ${mainbook.name}`,
        )
      })
      break
    default:
      console.info('unknown inspect', inspect)
      break
  }
}
