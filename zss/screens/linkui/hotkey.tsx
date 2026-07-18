import { useCallback, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { Rect } from 'zss/gadget/rect'
import { UserHotkey } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

export function LinkHotkey({ surface }: LinkWidgetProps) {
  linkbegin(surface)

  const rawwords = surface.words.map((v) => maptovalue(v, ''))
  const parsed = useMemo(
    () => parseterminalmodemprefix(surface.modemprefix),
    [surface.modemprefix],
  )

  // Panel-shaped words after resolvelinktypeandwords:
  // [target, shortcut, maybetext, maybenoclose?, ...data]
  const target = rawwords[0] ?? ''
  const shortcut = rawwords[1] ?? ''
  const maybetext = rawwords[2] ?? ''
  const maybenoclose = rawwords[3] ?? ''
  const data = rawwords.slice(4)

  const routetarget =
    surface.layout === 'terminal' && surface.modemprefix.trim().length > 0
      ? surface.modemprefix
      : target

  const altshortcut =
    surface.layout === 'panel' &&
    typeof shortcut === 'string' &&
    shortcut.length === 1 &&
    /[a-z]/i.test(shortcut)
      ? `shift+${shortcut.toLowerCase()}`
      : undefined

  const text = maybetext || ` ${(shortcut ?? '').toUpperCase()} `
  const tcolor = inputcolor(!!surface.active)

  const content = `${
    surface.context.iseven ? '$black$onltgray' : '$black$ondkcyan'
  }${text}${tcolor}$onclear ${surface.label}${surface.layout === 'panel' && ispresent(surface.row) ? `\n` : ''}`

  tokenizeandwritetextformat(content, surface.context, true)

  const invoke = useCallback(() => {
    if (!routetarget) {
      return
    }
    if (surface.layout === 'terminal') {
      surface.sendmessage(parsed?.chip ?? '', routetarget, [
        shortcut,
        maybetext,
        ...data,
      ])
    } else {
      surface.sendmessage(surface.chip, target, data)
      if (!maybenoclose) {
        surface.sendclose()
      }
    }
  }, [
    surface,
    parsed?.chip,
    routetarget,
    shortcut,
    maybetext,
    data,
    target,
    maybenoclose,
  ])

  if (surface.layout === 'panel') {
    const cx = surface.context.x - 0.25
    const cy = surface.context.y - 0.25
    return (
      <group
        position={[
          cx * RUNTIME.DRAW_CHAR_WIDTH(),
          cy * RUNTIME.DRAW_CHAR_HEIGHT(),
          1,
        ]}
      >
        <Rect
          visible={false}
          width={text.length + 0.5}
          height={1.5}
          blocking
          onClick={invoke}
        />
        {surface.active && <UserInput OK_BUTTON={invoke} />}
        {shortcut && (
          <UserHotkey hotkey={shortcut} althotkey={altshortcut}>
            {invoke}
          </UserHotkey>
        )}
      </group>
    )
  }

  return (
    <>
      {surface.active && <UserInput OK_BUTTON={invoke} />}
      {shortcut && <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey>}
    </>
  )
}
