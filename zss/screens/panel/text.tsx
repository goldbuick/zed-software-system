import { useState } from 'react'
import { useWaitForValueString } from 'zss/device/modem'
import { withclipboard } from 'zss/feature/keyboard'
import { paneladdress } from 'zss/gadget/data/types'
import { useBlink } from 'zss/gadget/hooks'
import { UserFocus, UserInput, UserInputMods } from 'zss/gadget/userinput'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { ismac } from 'zss/words/system'
import {
  applycolortoindexes,
  applystrtoindex,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelText({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const target = maptovalue(args[0], '')

  // state
  const address = paneladdress(chip, target)
  const value = useWaitForValueString(address)
  const state = value?.toJSON() ?? ''

  const blink = useBlink()
  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  const [selection, setSelection] = useState<number | undefined>(undefined)

  const tvalue = `${state} `
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // prefix
  tokenizeandwritetextformat(
    `$green $20 ${tcolor}${tlabel} $green`,
    context,
    false,
  )
  const tx = context.x
  const ty = context.y
  const tyw = ty * context.width

  // content
  context.writefullwidth = 32
  tokenizeandwritetextformat(`${tvalue}`, context, false)
  context.writefullwidth = undefined

  // input state
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
  if (focus && blink) {
    applystrtoindex(tx + cursor + tyw, String.fromCharCode(219), context)
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
              const state = value.toJSON()

              switch (lkey) {
                case 'delete':
                  if (hasselection) {
                    deleteselection()
                  } else if (state.length > 0) {
                    value.delete(cursor, 1)
                  }
                  break
                case 'backspace':
                  if (hasselection) {
                    deleteselection()
                  } else if (cursor > 0) {
                    value.delete(cursor - 1, 1)
                    setCursor((state) => Math.max(0, state - 1))
                  }
                  break
                default:
                  if (mods.ctrl) {
                    switch (lkey) {
                      case 'a':
                        setSelection(0)
                        setCursor(state.length)
                        break
                      case 'c':
                        if (ispresent(withclipboard())) {
                          withclipboard()
                            .writeText(value.toJSON())
                            .catch((err) => console.error(err))
                        }
                        break
                      case 'v':
                        if (ispresent(withclipboard())) {
                          withclipboard()
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
                      case 'x':
                        if (ispresent(withclipboard())) {
                          withclipboard()
                            .writeText(value.toJSON())
                            .then(() => deleteselection())
                            .catch((err) => console.error(err))
                        }
                        break
                    }
                  } else if (mods.alt) {
                    // no-op ?? - could this shove text around ??
                  } else if (
                    event.key.length === 1 &&
                    state.length < visiblerange
                  ) {
                    value.insert(cursor, event.key)
                    setCursor((state) => state + 1)
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
