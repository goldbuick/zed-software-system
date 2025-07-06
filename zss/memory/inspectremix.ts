import { get as idbget, update as idbupdate } from 'idb-keyval'
import { parsetarget } from 'zss/device'
import { boardremix } from 'zss/feature/boardremix'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ptstoarea } from 'zss/mapping/2d'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT, WORD } from 'zss/words/types'

import { memoryboardread, memoryreadplayerboard } from '.'

type REMIX_CONFIG = {
  stat: string
  patternsize: number
  mirror: number
}

// read / write from indexdb

export async function readremixconfig(): Promise<REMIX_CONFIG | undefined> {
  return idbget('remixconfig')
}

export async function writeremixconfig(
  updater: (oldValue: REMIX_CONFIG | undefined) => REMIX_CONFIG,
): Promise<void> {
  return idbupdate('remixconfig', updater)
}

let remixconfig: REMIX_CONFIG = {
  stat: '',
  patternsize: 2,
  mirror: 1,
}

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
      const sourceboard = memoryboardread(remixconfig.stat)
      if (ispresent(sourceboard)) {
        boardremix(
          board.id,
          sourceboard.id,
          remixconfig.patternsize,
          remixconfig.mirror,
          p1,
          p2,
          'all',
        )
      }
      await writeremixconfig(() => remixconfig)
      break
    }
    default:
      console.info('unknown remix', remix)
      break
  }
}

export async function memoryinspectremixmenu(player: string, p1: PT, p2: PT) {
  const config = await readremixconfig()
  remixconfig = {
    ...remixconfig,
    ...config,
  }

  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  function get(name: string) {
    const { target } = parsetarget(name)
    return remixconfig[target as keyof REMIX_CONFIG]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      const { target } = parsetarget(name)
      // @ts-expect-error bah
      remixconfig[target as keyof REMIX_CONFIG] = value
    }
  }

  gadgethyperlink(
    player,
    'remix',
    'source board',
    [`stat:${area}`, 'text'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'remix',
    'patternsize',
    [`patternsize:${area}`, 'number', '1', '5'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'remix',
    'mirror',
    [`mirror:${area}`, 'number', '1', '8'],
    get,
    set,
  )

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'remix', 'run', [
    `remixrun:${area}`,
    'hk',
    'r',
    ` R `,
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}
