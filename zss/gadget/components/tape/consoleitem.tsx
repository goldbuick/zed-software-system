import { useContext } from 'react'
import {
  WriteTextContext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  writetextcolorreset,
} from 'zss/gadget/data/textformat'

export type CONSOLE_ROW = [string, string, string, ...any[]]

type ConsoleItemProps = {
  row: CONSOLE_ROW
  active: boolean
  width: number
  height: number
}

export function ConsoleItem({ row, active, width, height }: ConsoleItemProps) {
  const context = useContext(WriteTextContext)
  const [, maybelevel, source, ...message] = row

  const level = maybelevel === 'log' ? '' : `${maybelevel[0]}:`
  const messagetext = message.map((v) => `${v}`).join(' ')

  // parse message text here ...

  // build output
  const rowtext = `${source}>${level} ${messagetext}`

  console.info(row)

  // measure output
  const measure = tokenizeandmeasuretextformat(rowtext, width, height)

  // position / track context
  context.y -= measure?.y ?? 1
  context.isEven = context.y % 2 === 0

  // render output
  const reset = context.y
  tokenizeandwritetextformat(rowtext, context, true)

  // reset
  context.y = reset
  // writetextcolorreset(context)

  return null
}
