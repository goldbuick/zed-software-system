import { useCallback, useContext } from 'react'
import { registercopy } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import {
  COPYIT_NOTE_TRANSPOSE_SENTINEL,
  transposenotesstring,
} from 'zss/memory/notecopyscroll'
import { paneladdress } from 'zss/gadget/data/types'
import { UserInput } from 'zss/gadget/userinput'
import { maptovalue } from 'zss/mapping/value'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  PanelItemProps,
  ScrollContext,
  inputcolor,
  setuppanelitem,
} from './common'

function isnotetransposecopyitargs(args: PanelItemProps['args']) {
  return (
    args.length >= 4 &&
    maptovalue(args[1], '') === COPYIT_NOTE_TRANSPOSE_SENTINEL
  )
}

function PanelCopyItPlain({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    registercopy(SOFTWARE, registerreadplayer(), extractcontentfromargs(args))
    scroll.sendclose()
  }, [args, scroll])

  const tcolor = inputcolor(!!active)
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}

function PanelCopyItTranspose({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const scroll = useContext(ScrollContext)
  const texttarget = maptovalue(args[2], '')
  const value = useWaitForValueString(paneladdress(chip, texttarget))
  const raw = value?.toJSON() ?? ''

  const invoke = useCallback(() => {
    const deltast = Number.parseInt(maptovalue(args[3], '0'), 10)
    const trimmed = raw.trim()
    if (!trimmed.length || Number.isNaN(deltast)) {
      registercopy(SOFTWARE, registerreadplayer(), '')
    } else {
      const out = transposenotesstring(trimmed, deltast)
      registercopy(SOFTWARE, registerreadplayer(), out ?? '')
    }
    scroll.sendclose()
  }, [args, raw, scroll])

  const tcolor = inputcolor(!!active)
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}

export function PanelCopyIt(props: PanelItemProps) {
  if (isnotetransposecopyitargs(props.args)) {
    return <PanelCopyItTranspose {...props} />
  }
  return <PanelCopyItPlain {...props} />
}
