import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { parsemarkdownforwriteui } from 'zss/feature/parse/markdownwriteui'
import { useWriteText } from 'zss/gadget/hooks'
import { UserInput } from 'zss/gadget/userinput'
import { doasync } from 'zss/mapping/func'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function TerminalOpenIt({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    const [, openmethod, ...values] = words
    const content = values.join(' ')
    const player = registerreadplayer()
    setTimeout(() => {
      switch (openmethod) {
        case 'wiki':
          doasync(SOFTWARE, player, async () => {
            const markdowntext = await fetchwiki(content)
            parsemarkdownforwriteui(player, markdowntext)
          })
          break
        case 'inline':
          window.location.href = content
          break
        default:
          window.open(`${openmethod} ${content}`.trim(), '_blank')
          break
      }
    }, 100)
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowOPENIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
