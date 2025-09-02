import { parsetarget } from 'zss/device'
import { api_toast, register_copy, vm_cli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'
import { COLOR, PT } from 'zss/words/types'

import { boardgetterrain } from './board'
import { bookelementdisplayread } from './book'
import { memoryinspectempty, memoryinspectemptymenu } from './inspect'
import {
  memoryinspectbgarea,
  memoryinspectchararea,
  memoryinspectcolorarea,
} from './inspectarea'
import {
  memoryinspectcopy,
  memoryinspectcopymenu,
  memoryinspectcut,
  memoryinspectcutmenu,
  memoryinspectpaste,
  memoryinspectpastemenu,
} from './inspectcopypaste'

import { memoryreadplayerboard } from '.'

export async function memoryinspectbatchcommand(path: string, player: string) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const batch = parsetarget(path)
  const [x1, y1, x2, y2] = batch.path.split(',').map((v) => parseFloat(v))
  const p1: PT = { x: Math.min(x1, x2), y: Math.min(y1, y2) }
  const p2: PT = { x: Math.max(x1, x2), y: Math.max(y1, y2) }
  switch (batch.target) {
    case 'copy':
      memoryinspectcopymenu(player, p1, p2)
      break
    case 'copyall':
    case 'copyobjects':
    case 'copyterrain':
      await memoryinspectcopy(player, p1, p2, batch.target)
      break
    case 'copyastext': {
      const p1x = Math.min(p1.x, p2.x)
      const p1y = Math.min(p1.y, p2.y)
      const p2x = Math.max(p1.x, p2.x)
      const p2y = Math.max(p1.y, p2.y)
      let content = ''
      for (let y = p1y; y <= p2y; ++y) {
        let color = COLOR.ONCLEAR
        let bg = COLOR.ONCLEAR
        content += ''
        for (let x = p1x; x <= p2x; ++x) {
          const element = boardgetterrain(board, x, y)
          const display = bookelementdisplayread(element)
          if (display.color != color) {
            color = display.color
            content += `$${COLOR[display.color]}`.toLowerCase()
          }
          if (display.bg != bg) {
            bg = display.bg
            content += `$ON${COLOR[display.bg]}`.toLowerCase()
          }
          content += `$${display.char}`
        }
        content += '\n'
      }
      register_copy(SOFTWARE, player, content)
      api_toast(SOFTWARE, player, 'copied chars')
      break
    }
    case 'cut':
      memoryinspectcutmenu(player, p1, p2)
      break
    case 'cutall':
    case 'cutobjects':
    case 'cutterrain':
      await memoryinspectcut(player, p1, p2, batch.target)
      break
    case 'paste':
      memoryinspectpastemenu(player, p1, p2)
      break
    case 'pasteall':
    case 'pasteobjects':
    case 'pasteterrain':
    case 'pasteterraintiled':
      await memoryinspectpaste(player, p1, p2, batch.target)
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
      register_copy(SOFTWARE, player, [x1, y1, x2, y2].join(' '))
      break
    case 'pageopen':
      doasync(SOFTWARE, player, async () => {
        // wait a little
        await waitfor(800)
        // open codepage
        vm_cli(SOFTWARE, player, `#pageopen ${batch.path}`)
      })
      break
    default:
      console.info('unknown batch', batch)
      break
  }
}
