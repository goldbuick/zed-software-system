import { paneladdress } from 'zss/gadget/data/types'
import { maptonumber, maptovalue } from 'zss/mapping/value'
import {
  PanelItemProps,
  inputcolor,
  setuppanelitem,
  strsplice,
} from 'zss/screens/panel/common'
import { NumberInput } from 'zss/screens/shared/numberinput'

const maybedefault = -111111

export function PanelNumber({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, maybemin, maybemax] = [
    maptovalue(args[0], ''),
    maptonumber(args[1], maybedefault),
    maptonumber(args[2], maybedefault),
  ]

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

  const address = paneladdress(chip, target)

  return (
    <NumberInput
      active={active}
      address={address}
      label={label}
      min={min}
      max={max}
      adapter={{
        context,
        setup: () => setuppanelitem(sidebar, row, context),
        writeaddress: target,
        inputcolor,
        strsplice,
      }}
    />
  )
}
