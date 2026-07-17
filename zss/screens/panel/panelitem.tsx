import { useContext } from 'react'
import { registerreadplayer } from 'zss/device/registerplayer'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { useWriteText } from 'zss/gadget/writetext'
import { isarray } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { resolvelinktypeandwords } from 'zss/screens/linkui/linktypes'
import { LinkRouter } from 'zss/screens/linkui/router'
import type { LinkSurface } from 'zss/screens/linkui/types'

import { ScrollContext, setuppanelitem } from './common'
import { PanelContent } from './content'

type PanelItemComponentProps = {
  sidebar: boolean
  row?: number
  striperow?: number
  item: PANEL_ITEM
  active: boolean
}

export function PanelItem({
  sidebar,
  row,
  striperow,
  item,
  active,
}: PanelItemComponentProps) {
  const player = registerreadplayer()
  const context = useWriteText()
  const scroll = useContext(ScrollContext)

  setuppanelitem(sidebar, row, context)

  if (typeof item === 'string') {
    return (
      <PanelContent
        sidebar={sidebar}
        player={player}
        item={item}
        row={row}
        context={context}
      />
    )
  }

  if (!isarray(item)) {
    return null
  }

  const [chip, label, ...rest] = item

  if (typeof chip !== 'string' || typeof label !== 'string') {
    return null
  }

  const { linktype, words } = resolvelinktypeandwords(
    rest.map((w) => maptostring(w)),
  )

  const drawrow = row ?? 0
  const surface: LinkSurface = {
    layout: 'panel',
    active,
    label,
    words,
    chip,
    modemprefix: '',
    row: drawrow,
    striperow: striperow ?? drawrow,
    sidebar,
    context,
    sendmessage: scroll.sendmessage,
    sendclose: scroll.sendclose,
    setcursor: scroll.setcursor,
  }

  return <LinkRouter linktype={linktype} surface={surface} />
}
