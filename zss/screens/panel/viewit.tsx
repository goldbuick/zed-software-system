import { useCallback } from 'react'
import { useMedia } from 'zss/gadget/hooks'
import { UserInput } from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelViewIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const { setviewimage } = useMedia()
  const invoke = useCallback(() => {
    const [, ...values] = args
    const content = values.join(' ')
    setviewimage(content)
  }, [setviewimage, args])

  const tcolor = inputcolor(!!active)

  // render output
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $cyanVIEWIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
