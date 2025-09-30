import { get as idbget, update as idbupdate } from 'idb-keyval'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { WORD } from 'zss/words/types'

import { memoryreadplayerboard } from '.'

type FINDANY_CONFIG = {
  expr1: string
  expr2: string
  expr3: string
  expr4: string
}

// read / write from indexdb

export async function readfindanyconfig(): Promise<FINDANY_CONFIG | undefined> {
  return idbget('findanyconfig')
}

export async function writefindanyconfig(
  updater: (oldValue: FINDANY_CONFIG | undefined) => FINDANY_CONFIG,
): Promise<void> {
  return idbupdate('findanyconfig', updater)
}

let findanyconfig: FINDANY_CONFIG = {
  expr1: 'object',
  expr2: '',
  expr3: '',
  expr4: '',
}

export async function memoryfindany(player: string) {
  const config = await readfindanyconfig()
  findanyconfig = {
    ...findanyconfig,
    ...config,
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  gadgettext(player, `find any element(s)`)
  gadgettext(player, DIVIDER)

  function get(name: string) {
    return findanyconfig[name as keyof FINDANY_CONFIG]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      // @ts-expect-error bah
      findanyconfig[name as keyof FINDANY_CONFIG] = value
    }
  }

  gadgethyperlink(player, 'findany', 'slot 1: any', ['expr1', 'text'], get, set)
  gadgethyperlink(player, 'findany', 'slot 2: any', ['expr2', 'text'], get, set)
  gadgethyperlink(player, 'findany', 'slot 3: any', ['expr3', 'text'], get, set)
  gadgethyperlink(player, 'findany', 'slot 4: any', ['expr4', 'text'], get, set)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'findany', 'clear find(s)', [
    'clear',
    'hk',
    'c',
    ` C `,
  ])
  gadgethyperlink(player, 'findany', 'find 1', ['find1', 'hk', '1', ` 1 `])
  gadgethyperlink(player, 'findany', 'find 2', ['find2', 'hk', '2', ` 2 `])
  gadgethyperlink(player, 'findany', 'find 3', ['find3', 'hk', '3', ` 3 `])
  gadgethyperlink(player, 'findany', 'find 4', ['find4', 'hk', '4', ` 4 `])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'findany'
  shared.scroll = gadgetcheckqueue(player)
}
