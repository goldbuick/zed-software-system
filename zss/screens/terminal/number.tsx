import { useWriteText } from 'zss/gadget/writetext'
import { maptonumber } from 'zss/mapping/value'
import { inputcolor, strsplice } from 'zss/screens/panel/common'
import { NumberInput } from 'zss/screens/shared/numberinput'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'

const maybedefault = -111111

export function TerminalNumber({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const maybemin = maptonumber(words[2], maybedefault)
  const maybemax = maptonumber(words[3], maybedefault)

  let min: number
  let max: number
  if (maybemin === maybedefault) {
    min = 0
    max = 31
  } else if (maybemax === maybedefault) {
    min = 0
    max = maybemin
  } else {
    min = maybemin
    max = maybemax
  }

  return (
    <NumberInput
      active={!!active}
      address={prefix}
      label={label}
      min={min}
      max={max}
      adapter={{
        context,
        setup: () => setuplogitem(!!active, 0, y, context),
        writeaddress: prefix,
        inputcolor,
        strsplice,
      }}
    />
  )
}
