import { resettiles } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ActionRow } from './actionrow'
import { ACTION_ROW_WIDTH } from './layout'

type ElementsProps = {
  width: number
  showactionrow?: boolean
}

const FG = COLOR.WHITE
const BG = COLOR.DKPURPLE

export function Elements({ width, showactionrow = true }: ElementsProps) {
  const context = useWriteText()
  resettiles(context, 32, FG, BG)

  const mid = Math.floor(width * 0.5)
  context.x = Math.max(0, Math.floor(mid * 0.5) - 2)
  context.y = 4
  tokenizeandwritetextformat(`$whiteMOVE`, context, false)
  context.x = mid + Math.max(0, Math.floor(mid * 0.5) - 2)
  context.y = 4
  tokenizeandwritetextformat(`$whiteSHOOT`, context, false)

  if (!showactionrow) {
    return null
  }

  return (
    <ActionRow
      x={Math.max(0, Math.floor((width - ACTION_ROW_WIDTH) * 0.5))}
      y={0}
    />
  )
}
