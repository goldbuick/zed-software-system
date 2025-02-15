import { registerreadplayer } from 'zss/device/register'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { useWriteText } from 'zss/gadget/hooks'
import { isarray, isstring } from 'zss/mapping/types'
import { writetextreset } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { PanelItemCharEdit } from './charedit'
import { PanelItemColorEdit } from './coloredit'
import { PanelItemProps, setuppanelitem } from './common'
import { PanelItemContent } from './content'
import { PanelItemCopyIt } from './copyit'
import { PanelItemHotkey } from './hotkey'
import { PanelItemHyperlink } from './hyperlink'
import { PanelItemLinkIt } from './linkit'
import { PanelItemNumber } from './number'
import { PanelItemRange } from './range'
import { PanelItemSelect } from './select'
import { PanelItemText } from './text'
import { PanelItemZSSEdit } from './zssedit'

type PanelItemComponentProps = {
  row?: number
  item: PANEL_ITEM
  active: boolean
}

export function PanelItem({ row, item, active }: PanelItemComponentProps) {
  const player = registerreadplayer()
  const context = useWriteText()

  setuppanelitem(row, context)
  context.iseven = context.y % 2 === 0

  if (typeof item === 'string') {
    return (
      <PanelItemContent
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
      case 'linkit':
        return <PanelItemLinkIt {...props} />
      case 'zssedit':
        return <PanelItemZSSEdit {...props} />
      case 'charedit':
        return <PanelItemCharEdit {...props} />
      case 'coloredit':
        return <PanelItemColorEdit {...props} />
    }

    writetextreset(context)
  }
  return null
}
