import { useCallback } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useMedia } from '../hooks'
import { UserInput } from '../userinput'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelItemViewIt({
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
    setTimeout(() => setviewimage(content), 100)
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
