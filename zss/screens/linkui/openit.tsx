import { useCallback } from 'react'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { fetchrefscrolltext } from 'zss/feature/fetchrefscrolltext'
import { terminalwritemarkdownlines } from 'zss/feature/parse/markdownterminal'
import { UserHotkey } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { linkactionprefix, linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

function wordasstring(word: unknown): string {
  if (typeof word === 'string') {
    return word
  }
  if (typeof word === 'number' || typeof word === 'boolean') {
    return String(word)
  }
  return ''
}

function findhki(words: unknown[]): number {
  for (let i = 0; i < words.length; ++i) {
    const w = NAME(wordasstring(words[i]))
    if (w === 'hk' || w === 'hotkey') {
      return i
    }
  }
  return -1
}

export function LinkOpenIt({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const words = surface.words
  const hki = findhki(words)
  const beforehk = hki >= 0 ? words.slice(0, hki) : words
  const shortcut = hki >= 0 ? wordasstring(words[hki + 1]) : ''
  const maybetext = hki >= 0 ? wordasstring(words[hki + 2]) : ''

  const invoke = useCallback(() => {
    const [, openmethod] = beforehk
    const content = extractcontentfromargs(beforehk, 2)
    const player = registerreadplayer()
    setTimeout(() => {
      switch (openmethod) {
        case 'zns':
          doasync(SOFTWARE, player, async () => {
            const markdowntext = await fetchrefscrolltext(content)
            if (markdowntext.trim()) {
              terminalwritemarkdownlines(player, markdowntext)
            }
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
  }, [beforehk])

  const tcolor = inputcolor(!!surface.active)
  if (shortcut) {
    const badge = maybetext || ` ${shortcut.toUpperCase()} `
    const badgebg = surface.context.iseven
      ? '$black$onltgray'
      : '$black$ondkcyan'
    tokenizeandwritetextformat(
      `${badgebg}${badge}${tcolor}$onclear ${surface.label}${surface.layout === 'panel' ? '\n' : ''}`,
      surface.context,
      true,
    )
  } else {
    tokenizeandwritetextformat(
      `${linkactionprefix(surface)}$purple$16 $yellowOPENIT ${tcolor}${surface.label}${surface.layout === 'panel' ? '\n' : ''}`,
      surface.context,
      true,
    )
  }

  return (
    <>
      {surface.active ? <UserInput OK_BUTTON={invoke} /> : null}
      {shortcut ? <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey> : null}
    </>
  )
}
