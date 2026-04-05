import { get as idbget, update as idbupdate } from 'idb-keyval'
import { parsetarget } from 'zss/device'
import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { boardremix } from 'zss/feature/boardremix'
import { DIVIDER, zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ptstoarea } from 'zss/mapping/2d'
import { waitfor } from 'zss/mapping/tick'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memoryreadboardbyaddress } from './boards'
import { memoryreadplayerboard } from './playermanagement'

// Remix operations
type REMIX_CONFIG = {
  stat: string
  patternsize: number
  mirror: number
}

// read / write from indexdb

export async function memoryinspectremixcommand(path: string, player: string) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const remix = parsetarget(path)
  const [x1, y1, x2, y2] = remix.path.split(',').map((v) => parseFloat(v))
  const p1: PT = { x: Math.min(x1, x2), y: Math.min(y1, y2) }
  const p2: PT = { x: Math.max(x1, x2), y: Math.max(y1, y2) }
  switch (remix.target) {
    case 'remix': {
      await memoryinspectremixmenu(player, p1, p2)
      break
    }
    case 'remixrun': {
      const sourceboard = memoryreadboardbyaddress(remixconfig.stat)
      if (ispresent(sourceboard)) {
        if (
          boardremix(
            board.id,
            sourceboard.id,
            remixconfig.patternsize,
            remixconfig.mirror,
            p1,
            p2,
            'all',
          )
        ) {
          await waitfor(3000)
        } else {
          apitoast(SOFTWARE, player, `failed to remix`)
        }
      }
      await memorywriteremixconfig(() => remixconfig)
      await waitfor(100)
      await memoryinspectremixmenu(player, p1, p2)
      break
    }
    default:
      console.info('unknown remix', remix)
      break
  }
}

export async function memoryinspectremixmenu(player: string, p1: PT, p2: PT) {
  const config = await memoryreadremixconfig()
  remixconfig = {
    ...remixconfig,
    ...config,
  }

  const area = ptstoarea(p1, p2)

  registerhyperlinksharedbridge(
    'remix',
    'text',
    (target) => {
      if (target === 'stat') {
        return remixconfig.stat
      }
      return ''
    },
    (name, value) => {
      if (isstring(value) && name === 'stat') {
        remixconfig.stat = value
      }
    },
  )
  registerhyperlinksharedbridge(
    'remix',
    'number',
    (target) => {
      if (target === 'patternsize') {
        return remixconfig.patternsize
      }
      if (target === 'mirror') {
        return remixconfig.mirror
      }
      return 0
    },
    (name, value) => {
      if (isnumber(value)) {
        if (name === 'patternsize') {
          remixconfig.patternsize = value
        } else if (name === 'mirror') {
          remixconfig.mirror = value
        }
      }
    },
  )

  const lines = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    zsszedlinkline('stat text', 'source board'),
    zsszedlinkline('patternsize number 1 5', 'patternsize'),
    zsszedlinkline('mirror number 1 8', 'mirror'),
    DIVIDER,
    zsszedlinkline(`remixrun:${area} hk r " R "`, 'run'),
  ]
  scrollwritelines(player, 'remix', zsstexttape(lines), 'remix')
}

export async function memoryreadremixconfig(): Promise<
  REMIX_CONFIG | undefined
> {
  return idbget('remixconfig')
}

export async function memorywriteremixconfig(
  updater: (oldvalue: REMIX_CONFIG | undefined) => REMIX_CONFIG,
): Promise<void> {
  return idbupdate('remixconfig', updater)
}

let remixconfig: REMIX_CONFIG = {
  stat: '',
  patternsize: 2,
  mirror: 1,
}
