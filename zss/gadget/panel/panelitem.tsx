import { registerreadplayer } from 'zss/device/register'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { useWriteText } from 'zss/gadget/hooks'
import { isarray } from 'zss/mapping/types'
import { writetextreset } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { PanelItemProps } from './common'
import { PanelItemContent } from './content'
import { PanelItemHotkey } from './hotkey'
import { PanelItemHyperlink } from './hyperlink'
import { PanelItemNumber } from './number'
import { PanelItemRange } from './range'
import { PanelItemSelect } from './select'
import { PanelItemText } from './text'

type PanelItemComponentProps = {
  item: PANEL_ITEM
  inline: boolean
  active: boolean
}

export function PanelItem({ item, inline, active }: PanelItemComponentProps) {
  const player = registerreadplayer()
  const context = useWriteText()

  context.iseven = context.y % 2 === 0

  if (typeof item === 'string') {
    return (
      <PanelItemContent
        player={player}
        item={item}
        inline={inline}
        context={context}
      />
    )
  } else if (isarray(item)) {
    const [chip, label, input, ...args] = item

    if (
      typeof chip !== 'string' ||
      typeof label !== 'string' ||
      typeof input !== 'string'
    ) {
      return null
    }

    const props: PanelItemProps = {
      player,
      chip,
      inline,
      active,
      label,
      args,
      context,
    }

    switch (NAME(input)) {
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
