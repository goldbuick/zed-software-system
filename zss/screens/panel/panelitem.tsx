import { registerreadplayer } from 'zss/device/register'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { useWriteText } from 'zss/gadget/hooks'
import { isarray, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { PanelCharEdit } from './charedit'
import { PanelColorEdit } from './coloredit'
import { PanelItemProps, setuppanelitem } from './common'
import { PanelContent } from './content'
import { PanelCopyIt } from './copyit'
import { PanelHotkey } from './hotkey'
import { PanelHyperlink } from './hyperlink'
import { PanelNumber } from './number'
import { PanelOpenIt } from './openit'
import { PanelRange } from './range'
import { PanelRunIt } from './runit'
import { PanelSelect } from './select'
import { PanelText } from './text'
import { PanelViewIt } from './viewit'
import { PanelZSSEdit } from './zssedit'

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
      <PanelContent
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
        return <PanelHyperlink {...props} />
      case 'hk':
      case 'hotkey':
        return <PanelHotkey {...props} />
      case 'rn':
      case 'range':
        return <PanelRange {...props} />
      case 'sl':
      case 'select':
        return <PanelSelect {...props} />
      case 'nm':
      case 'number':
        return <PanelNumber {...props} />
      case 'tx':
      case 'text':
        return <PanelText {...props} />
      case 'copyit':
        return <PanelCopyIt {...props} />
      case 'openit':
        return <PanelOpenIt {...props} />
      case 'viewit':
        return <PanelViewIt {...props} />
      case 'runit':
        return <PanelRunIt {...props} />
      case 'zssedit':
        return <PanelZSSEdit {...props} />
      case 'charedit':
        return <PanelCharEdit {...props} />
      case 'coloredit':
        return <PanelColorEdit {...props} />
      case 'bgedit':
        return <PanelColorEdit isbg {...props} />
    }
  }
  return null
}
