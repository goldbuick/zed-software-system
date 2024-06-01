import {
  tokenizeandwritetextformat,
  writetextcolorreset,
} from 'zss/gadget/data/textformat'

import { BG, BG_ACTIVE, ConsoleItemProps } from './common'
import { ConsoleItemHyperlink } from './hyperlink'

export function ConsoleItem({
  blink,
  active,
  text,
  offset,
  context,
}: ConsoleItemProps) {
  if (text.startsWith('!')) {
    return (
      <ConsoleItemHyperlink
        blink={blink}
        active={active}
        text={text}
        offset={offset}
        context={context}
      />
    )
  }

  // render output
  context.y = context.height - 3 + offset
  context.isEven = context.y % 2 === 0
  context.activeBg = active && !blink ? BG_ACTIVE : BG
  tokenizeandwritetextformat(text, context, true)
  writetextcolorreset(context)

  return null
}
