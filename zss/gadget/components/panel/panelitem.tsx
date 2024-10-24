import { useWriteText, writetextreset } from 'zss/gadget/data/textformat'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { isarray } from 'zss/mapping/types'

import { usePlayer } from '../useplayer'

import { PanelItemContent } from './content'
import { PanelItemHotkey } from './hotkey'
import { PanelItemHyperlink } from './hyperlink'
import { PanelItemNumber } from './number'
import { PanelItemRange } from './range'
import { PanelItemSelect } from './select'
import { PanelItemText } from './text'

type PanelItemProps = {
  item: PANEL_ITEM
  active: boolean
}

export function PanelItem({ item, active }: PanelItemProps) {
  const player = usePlayer()
  const context = useWriteText()

  context.iseven = context.y % 2 === 0

  if (typeof item === 'string') {
    return <PanelItemContent player={player} item={item} context={context} />
  } else if (isarray(item)) {
    const [chip, label, input, ...args] = item

    if (
      typeof chip !== 'string' ||
      typeof label !== 'string' ||
      typeof input !== 'string'
    ) {
      return null
    }

    const props = {
      player,
      chip,
      active,
      label,
      args,
      context,
    }

    switch (input.toLowerCase()) {
      case 'hk':
      case 'hotkey':
        return <PanelItemHotkey {...props} />
      case 'hyperlink':
        return <PanelItemHyperlink {...props} />
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
    }

    writetextreset(context)
  }
  return null
}
