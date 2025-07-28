import { registerreadplayer } from 'zss/device/register'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { useWriteText } from 'zss/gadget/hooks'
import { isarray, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { PanelItemCharEdit } from './charedit'
import { PanelItemColorEdit } from './coloredit'
import { PanelItemProps, setuppanelitem } from './common'
import { PanelItemContent } from './content'
import { PanelItemCopyIt } from './copyit'
import { PanelItemHotkey } from './hotkey'
import { PanelItemHyperlink } from './hyperlink'
import { PanelItemNumber } from './number'
import { PanelItemOpenIt } from './openit'
import { PanelItemRange } from './range'
import { PanelItemSelect } from './select'
import { PanelItemText } from './text'
import { PanelItemViewIt } from './viewit'
import { PanelItemZSSEdit } from './zssedit'

type PanelItemComponentProps = {
  sidebar: boolean
  row?: number
  item: PANEL_ITEM
  active: boolean
}

export function PanelItem({
  sidebar,
  row,
  item,
  active,
}: PanelItemComponentProps) {
  const player = registerreadplayer()
  const context = useWriteText()

  setuppanelitem(sidebar, row, context)
  context.iseven = context.y % 2 === 0

  if (typeof item === 'string') {
    return (
      <PanelItemContent
        sidebar={sidebar}
        player={player}
        item={item}
        row={row}
        context={context}
      />
    )
  } else if (isarray(item)) {
    const [chip, label, target, maybetype, ...args] = item

    if (
      typeof chip !== 'string' ||
      typeof label !== 'string' ||
      typeof target !== 'string'
    ) {
      return null
    }

    const props: PanelItemProps = {
      sidebar,
      player,
      chip,
      row,
      active,
      label,
      // prefix args with target
      args: [target, ...args],
      context,
    }

    const type = isstring(maybetype) ? maybetype : ''
    switch (NAME(type)) {
      default:
      case 'hyperlink':
        return <PanelItemHyperlink {...props} />
      case 'hk':
      case 'hotkey':
        return <PanelItemHotkey {...props} />
      case 'rn':
      case 'range':
        return <PanelItemRange {...props} />
      case 'sl':
      case 'select':
        return <PanelItemSelect {...props} />
      case 'nm':
      case 'number':
        return <PanelItemNumber {...props} />
      case 'tx':
      case 'text':
        return <PanelItemText {...props} />
      case 'copyit':
        return <PanelItemCopyIt {...props} />
      case 'openit':
        return <PanelItemOpenIt {...props} />
      case 'viewit':
        return <PanelItemViewIt {...props} />
      case 'zssedit':
        return <PanelItemZSSEdit {...props} />
      case 'charedit':
        return <PanelItemCharEdit {...props} />
      case 'coloredit':
        return <PanelItemColorEdit {...props} />
    }
  }
  return null
}
