import { useState } from 'react'
import { useWaitForValueString } from 'zss/device/modem'
import { withclipboard } from 'zss/feature/keyboard'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserFocus, UserInput, UserInputMods } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { drawblockcursor } from 'zss/screens/inputcommon'
import { ismac } from 'zss/words/system'
import {
  applycolortoindexes,
  textformatreadedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

export function TerminalText({
  active,
  prefix,
  label,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  useHyperlinkSharedSync(prefix, 'text')

  const address = prefix
  const value = useWaitForValueString(address)
  const state = value?.toJSON() ?? ''

  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  const [selection, setSelection] = useState<number | undefined>(undefined)

  const tvalue = `${state} `
  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `$green $20 ${tcolor}${tlabel} $green`,
    context,
    false,
  )
  const tx = context.x
  const ty = context.y
  const tyw = ty * context.width

  context.writefullwidth = 32
  tokenizeandwritetextformat(`${tvalue}`, context, false)
  context.writefullwidth = undefined

  const hasselection = ispresent(selection)
  const visiblerange = context.width - tx - 2
  const left = hasselection ? Math.min(selection, cursor) : cursor
  let right = hasselection ? Math.max(selection, cursor) : cursor
  if (hasselection) {
    if (right !== left && right === cursor) {
      --right
    }
    applycolortoindexes(tx + left + tyw, tx + right + tyw, 15, 8, context)
  }
  if (focus) {
    const edge = textformatreadedges(context)
    drawblockcursor(cursor, 0, { ...edge, left: tx, top: ty }, context)
  }

  function deleteselection() {
    if (ispresent(value)) {
      setCursor(left)
      setSelection(undefined)
      value.delete(left, right - left + 1)
    }
  }

  return (
    <>
      {active && (
        <UserInput
          OK_BUTTON={() => {
            if (value) {
              setFocus(true)
              setCursor(value.length)
              setSelection(undefined)
            }
          }}
        />
      )}
      {focus && (
        <UserFocus blockhotkeys>
          <UserInput
            MOVE_LEFT={(mods) => {
              if (mods.shift) {
                if (!ispresent(selection)) {
                  setSelection(clamp(cursor - 1, 0, state.length))
                }
              } else {
                setSelection(undefined)
              }
              setCursor((c) => clamp(c - 1, 0, state.length))
            }}
            MOVE_RIGHT={(mods) => {
              if (mods.shift) {
                if (!ispresent(selection)) {
                  setSelection(cursor)
                }
              } else {
                setSelection(undefined)
              }
              setCursor((c) => clamp(c + 1, 0, state.length))
            }}
            CANCEL_BUTTON={() => {
              setFocus(false)
              setCursor(state.length)
              setSelection(undefined)
            }}
            OK_BUTTON={() => setFocus(false)}
            keydown={(event) => {
              if (!value) {
                return
              }

              const { key } = event
              const lkey = NAME(key)
              const mods: UserInputMods = {
                alt: event.altKey,
                ctrl: ismac ? event.metaKey : event.ctrlKey,
                shift: event.shiftKey,
              }
              const stateLen = value.toJSON().length

              switch (lkey) {
                case 'delete':
                  if (hasselection) {
                    deleteselection()
                  } else if (stateLen > 0) {
                    value.delete(cursor, 1)
                  }
                  break
                case 'backspace':
                  if (hasselection) {
                    deleteselection()
                  } else if (cursor > 0) {
                    value.delete(cursor - 1, 1)
                    setCursor((c) => Math.max(0, c - 1))
                  }
                  break
                default:
                  if (mods.ctrl) {
                    switch (lkey) {
                      case 'a':
                        setSelection(0)
                        setCursor(stateLen)
                        break
                      case 'c': {
                        const clipboard = withclipboard()
                        if (ispresent(clipboard)) {
                          clipboard
                            .writeText(value.toJSON())
                            .catch((err) => console.error(err))
                        }
                        break
                      }
                      case 'v': {
                        const clipboard = withclipboard()
                        if (ispresent(clipboard)) {
                          clipboard
                            .readText()
                            .then((text) => {
                              if (hasselection) {
                                deleteselection()
                              }
                              value.insert(cursor, text)
                              setCursor(cursor + text.length)
                            })
                            .catch((err) => console.error(err))
                        }
                        break
                      }
                      case 'x': {
                        const clipboard = withclipboard()
                        if (ispresent(clipboard)) {
                          clipboard
                            .writeText(value.toJSON())
                            .then(() => deleteselection())
                            .catch((err) => console.error(err))
                        }
                        break
                      }
                    }
                  } else if (
                    event.key.length === 1 &&
                    stateLen < visiblerange
                  ) {
                    value.insert(cursor, event.key)
                    setCursor((c) => c + 1)
                  }
                  break
              }
            }}
          />
        </UserFocus>
      )}
    </>
  )
}
