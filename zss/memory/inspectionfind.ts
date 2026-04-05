import { get as idbget, update as idbupdate } from 'idb-keyval'
import { vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DIVIDER, zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'

import { memoryreadplayerboard } from './playermanagement'

// Find operations
export type FINDANY_CONFIG = {
  expr1: string
  expr2: string
  expr3: string
  expr4: string
}

let findanyconfig: FINDANY_CONFIG = {
  expr1: 'player',
  expr2: '',
  expr3: '',
  expr4: '',
}

export async function memoryfindany(
  path: keyof typeof findanyconfig,
  player: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  await memorywritefindanyconfig(() => findanyconfig)

  const expr: string = findanyconfig[path] ?? ''
  if (ispresent(expr)) {
    vmcli(SOFTWARE, player, `#findany ${expr ? `any ${expr}` : ''}`)
  } else {
    // clear case
    vmcli(SOFTWARE, player, `#findany`)
  }
}

export async function memoryfindanymenu(player: string) {
  const config = await memoryreadfindanyconfig()
  findanyconfig = {
    ...findanyconfig,
    ...config,
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  registerhyperlinksharedbridge(
    'findany',
    'text',
    (target) => {
      const key = target as keyof FINDANY_CONFIG
      if (
        key === 'expr1' ||
        key === 'expr2' ||
        key === 'expr3' ||
        key === 'expr4'
      ) {
        return findanyconfig[key]
      }
      return ''
    },
    (name, value) => {
      if (isstring(value) || isnumber(value)) {
        const key = name as keyof FINDANY_CONFIG
        if (
          key === 'expr1' ||
          key === 'expr2' ||
          key === 'expr3' ||
          key === 'expr4'
        ) {
          // @ts-expect-error bah
          findanyconfig[key] = value
        }
      }
    },
  )

  const lines = [
    `find any element(s)`,
    DIVIDER,
    zsszedlinkline('expr1 text', 'slot 1: any'),
    zsszedlinkline('expr2 text', 'slot 2: any'),
    zsszedlinkline('expr3 text', 'slot 3: any'),
    zsszedlinkline('expr4 text', 'slot 4: any'),
    DIVIDER,
    zsszedlinkline('clear hk c " C "', 'clear find(s)'),
    zsszedlinkline('expr1 hk 1 " 1 "', 'find 1'),
    zsszedlinkline('expr2 hk 2 " 2 "', 'find 2'),
    zsszedlinkline('expr3 hk 3 " 3 "', 'find 3'),
    zsszedlinkline('expr4 hk 4 " 4 "', 'find 4'),
  ]
  scrollwritelines(player, 'findany', zsstexttape(lines), 'findany')
}

export async function memoryreadfindanyconfig(): Promise<
  FINDANY_CONFIG | undefined
> {
  return idbget('findanyconfig')
}

export async function memorywritefindanyconfig(
  updater: (oldValue: FINDANY_CONFIG | undefined) => FINDANY_CONFIG,
): Promise<void> {
  return idbupdate('findanyconfig', updater)
}
