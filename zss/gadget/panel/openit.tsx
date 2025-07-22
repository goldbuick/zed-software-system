import { useCallback } from 'react'
import { isstring } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { UserInput } from '../userinput'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelItemOpenIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const invoke = useCallback(() => {
    const [, openmethod, ...values] = args
    const content = values.join(' ')
    setTimeout(() => {
      if (openmethod === 'inline') {
        window.location.href = content
      } else if (isstring(openmethod)) {
        window.open(`${openmethod} ${content}`.trim(), '_blank')
      }
    }, 100)
  }, [args])

  const tcolor = inputcolor(!!active)

  // render output
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $yellowOPENIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
