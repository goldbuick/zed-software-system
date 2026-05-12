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
import { createinspectionconfig } from './inspectionconfig'
import { memoryreadplayerboard } from './playermanagement'

type REMIX_CONFIG = {
  stat: string
  patternsize: number
  mirror: number
}

const remixconfig = createinspectionconfig<REMIX_CONFIG>('remixconfig', {
  stat: '',
  patternsize: 2,
  mirror: 1,
})

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
      const cfg = remixconfig.read()
      const sourceboard = memoryreadboardbyaddress(cfg.stat)
      if (ispresent(sourceboard)) {
        if (
          boardremix(
            board.id,
            sourceboard.id,
            cfg.patternsize,
            cfg.mirror,
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
      await remixconfig.save()
      await waitfor(100)
      await memoryinspectremixmenu(player, p1, p2)
      break
    }
    default:
      console.info('unknown remix', remix)
      break
  }
}

registerhyperlinksharedbridge(
  'remix',
  'text',
  (_typ, target) => {
    if (target === 'stat') {
      return remixconfig.read().stat
    }
    return ''
  },
  (_typ, name, value) => {
    if (isstring(value) && name === 'stat') {
      remixconfig.write({ ...remixconfig.read(), stat: value })
    }
  },
)

registerhyperlinksharedbridge(
  'remix',
  'number',
  (_typ, target) => {
    const cfg = remixconfig.read()
    if (target === 'patternsize') {
      return cfg.patternsize
    }
    if (target === 'mirror') {
      return cfg.mirror
    }
    return 0
  },
  (_typ, name, value) => {
    if (isnumber(value)) {
      const cfg = remixconfig.read()
      if (name === 'patternsize') {
        remixconfig.write({ ...cfg, patternsize: value })
      } else if (name === 'mirror') {
        remixconfig.write({ ...cfg, mirror: value })
      }
    }
  },
)

export async function memoryinspectremixmenu(player: string, p1: PT, p2: PT) {
  await remixconfig.load()

  const area = ptstoarea(p1, p2)

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
