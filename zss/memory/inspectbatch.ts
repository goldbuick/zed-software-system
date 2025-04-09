import { parsetarget } from 'zss/device'
import { register_copy, vm_cli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { boardremix } from 'zss/feature/boardremix'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memoryinspectempty, memoryinspectemptymenu } from './inspect'
import {
  memoryinspectremix,
  memoryinspectbgarea,
  memoryinspectchararea,
  memoryinspectcolorarea,
} from './inspectarea'
import {
  memoryinspectcopy,
  memoryinspectcopymenu,
  memoryinspectpaste,
  memoryinspectpastemenu,
} from './inspectcopypaste'

import { memoryreadoperator, memoryreadplayerboard } from '.'

export function memoryinspectbatchcommand(path: string, player: string) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const batch = parsetarget(path)
  const [x1, y1, x2, y2] = batch.path.split(',').map((v) => parseFloat(v))
  const p1: PT = { x: x1, y: y1 }
  const p2: PT = { x: x2, y: y2 }
  switch (batch.target) {
    case 'copy':
      memoryinspectcopymenu(player, p1, p2)
      break
    case 'copyall':
    case 'copyobjects':
    case 'copyterrain':
      memoryinspectcopy(player, p1, p2, batch.target)
      break
    case 'paste':
      memoryinspectpastemenu(player, p1, p2)
      break
    case 'pasteall':
    case 'pasteobjects':
    case 'pasteterrain':
    case 'pasteterraintiled':
      memoryinspectpaste(player, p1, p2, batch.target)
      break
    case 'empty':
      memoryinspectemptymenu(player, p1, p2)
      break
    case 'emptyall':
    case 'emptyobjects':
    case 'emptyterrain':
      memoryinspectempty(player, p1, p2, batch.target)
      break
    case 'chars':
      memoryinspectchararea(player, p1, p2, 'char')
      break
    case 'colors':
      memoryinspectcolorarea(player, p1, p2, 'color')
      break
    case 'bgs':
      memoryinspectbgarea(player, p1, p2, 'bg')
      break
    case 'copycoords':
      register_copy(SOFTWARE, memoryreadoperator(), [x1, y1, x2, y2].join(' '))
      break
    case 'remixrun':
      boardremix(
        board.id,
        memoryinspectremix.stat,
        memoryinspectremix.patternsize,
        memoryinspectremix.mirror,
        p1,
        p2,
      )
      break
    case 'pageopen':
      doasync(SOFTWARE, player, async () => {
        // wait a little
        await waitfor(800)
        // open codepage
        vm_cli(SOFTWARE, memoryreadoperator(), `#pageopen ${batch.path}`)
      })
      break
    default:
      console.info('unknown batch', batch)
      break
  }
}
