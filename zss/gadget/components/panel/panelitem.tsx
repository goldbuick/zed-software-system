import React, { useContext } from 'react'
import {
  WriteTextContext,
  tokenizeAndWriteTextFormat,
  writeTextColorReset,
} from 'zss/gadget/data/textformat'
import { PANEL_ITEM } from 'zss/gadget/data/types'

import { PlayerContext } from './common'
import { PanelItemHotkey } from './hotkey'
import { PanelItemHyperText } from './hypertext'
import { PanelItemNumber } from './number'
import { PanelItemRange } from './range'
import { PanelItemSelect } from './select'
import { PanelItemText } from './text'
import { PanelItemInputText } from './textinput'

interface PanelItemProps {
  item: PANEL_ITEM
  active: boolean
}

export function PanelItem({ item, active }: PanelItemProps) {
  const player = useContext(PlayerContext)
  const context = useContext(WriteTextContext)

  context.isEven = context.y % 2 === 0

  if (typeof item === 'string') {
    return <PanelItemText player={player} item={item} context={context} />
  } else if (Array.isArray(item)) {
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
      case 'hypertext':
        return <PanelItemHyperText {...props} />
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
        return <PanelItemInputText {...props} />
      default:
        // throw an unknown input type error ?
        tokenizeAndWriteTextFormat(`$red unknown input type ${input}`, context)
        break
    }

    writeTextColorReset(context)
  }
  return null
}
