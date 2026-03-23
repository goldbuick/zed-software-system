import { useCallback, useContext, useMemo } from 'react'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { usehyperlinksharedsync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { ispresent } from 'zss/mapping/types'
import { chiptarget, inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalContext,
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

const shortcut = 'z'

export function TerminalZSSEdit({
  active,
  prefix,
  label,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  usehyperlinksharedsync(prefix, 'zssedit')

  const parsed = useMemo(() => parseterminalmodemprefix(prefix), [prefix])
  const tcolor = inputcolor(!!active)
  const text = ` ${shortcut.toUpperCase()} `

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${context.iseven ? '$black$onltgray' : '$black$ondkcyan'}${text}${tcolor}$onclear ${label}`,
    context,
    true,
  )

  const cc = useContext(TapeTerminalContext)
  const invoke = useCallback(() => {
    if (!ispresent(parsed)) {
      return
    }
    setTimeout(() => {
      cc.sendmessage(chiptarget(parsed.chip, parsed.target), [])
    }, 100)
  }, [cc, parsed])

  return (
    <>
      {active && <UserInput OK_BUTTON={invoke} />}
      {active && <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey>}
    </>
  )
}
