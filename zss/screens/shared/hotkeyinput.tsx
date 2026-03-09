import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'

export type HotkeyInputAdapter = {
  context: WRITE_TEXT_CONTEXT
  setup: () => void
  invoke: () => void
}

export type HotkeyInputProps = {
  active: boolean
  shortcut: string
  content: string
  adapter: HotkeyInputAdapter
  children?: ReactNode
}

export function HotkeyInput({
  active,
  shortcut,
  content,
  adapter,
  children,
}: HotkeyInputProps) {
  const { context, setup, invoke } = adapter
  setup()
  tokenizeandwritetextformat(content, context, true)

  const oninvoke = useCallback(() => {
    invoke()
  }, [invoke])

  return (
    <>
      {active && <UserInput OK_BUTTON={oninvoke} />}
      {shortcut && <UserHotkey hotkey={shortcut}>{oninvoke}</UserHotkey>}
      {children}
    </>
  )
}
