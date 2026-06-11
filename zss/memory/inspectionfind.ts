import { vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DIVIDER, zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'

import { createinspectionconfig } from './inspectionconfig'
import { memoryreadplayerboard } from './playermanagement'

export type FINDANY_CONFIG = {
  expr1: string
  expr2: string
  expr3: string
  expr4: string
}

const findanyconfig = createinspectionconfig<FINDANY_CONFIG>('findanyconfig', {
  expr1: 'player',
  expr2: '',
  expr3: '',
  expr4: '',
})

export async function memoryfindany(
  path: keyof FINDANY_CONFIG,
  player: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  await findanyconfig.save()

  const expr = findanyconfig.read()[path] ?? ''
  if (ispresent(expr)) {
    vmcli(SOFTWARE, player, `#findany ${expr ? `any ${expr}` : ''}`)
  } else {
    vmcli(SOFTWARE, player, `#findany`)
  }
}

registerhyperlinksharedbridge(
  'findany',
  'text',
  (_typ, target) => {
    const key = target as keyof FINDANY_CONFIG
    if (
      key === 'expr1' ||
      key === 'expr2' ||
      key === 'expr3' ||
      key === 'expr4'
    ) {
      return findanyconfig.read()[key]
    }
    return ''
  },
  (_typ, name, value) => {
    if (isstring(value) || isnumber(value)) {
      const key = name as keyof FINDANY_CONFIG
      if (
        key === 'expr1' ||
        key === 'expr2' ||
        key === 'expr3' ||
        key === 'expr4'
      ) {
        findanyconfig.write({ ...findanyconfig.read(), [key]: String(value) })
      }
    }
  },
)

export async function memoryfindanymenu(player: string) {
  await findanyconfig.load()

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

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
