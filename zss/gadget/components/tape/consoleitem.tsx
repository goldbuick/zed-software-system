import { useContext } from 'react'
import {
  WriteTextContext,
  tokenizeandwritetextformat,
  writetextcolorreset,
} from 'zss/gadget/data/textformat'

type ConsoleItemProps = {
  text: string
  blink?: boolean
  active?: boolean
  offset: number
}

export function ConsoleItem({ text, blink, active, offset }: ConsoleItemProps) {
  const context = useContext(WriteTextContext)

  // render output
  context.y = offset
  context.isEven = context.y % 2 === 0
  tokenizeandwritetextformat(text, context, true)
  writetextcolorreset(context)

  return null
}
