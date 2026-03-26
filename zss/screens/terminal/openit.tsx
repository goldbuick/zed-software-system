import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { terminalwritemarkdownlines } from 'zss/feature/parse/markdownterminal'
import { UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { doasync } from 'zss/mapping/func'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
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
    const [, openmethod] = words
    const content = extractcontentfromargs(words, 2)
    const player = registerreadplayer()
    setTimeout(() => {
      switch (openmethod) {
        case 'wiki':
          doasync(SOFTWARE, player, async () => {
            const markdowntext = await fetchwiki(content)
            terminalwritemarkdownlines(player, markdowntext)
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
