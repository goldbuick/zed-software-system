import { useEffect, useRef, useState } from 'react'
import { useWaitForValueString } from 'zss/device/modemhooks'
import { withclipboard } from 'zss/feature/keyboard'
import { paneladdress } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/device'
import {
  getmobiletextelement,
  mobiletextfocus,
  onmobiletextinput,
} from 'zss/gadget/mobiletext'
import { UserFocus, UserInput, UserInputMods } from 'zss/gadget/userinput'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { drawblockcursor } from 'zss/screens/inputcommon'
import { ismac } from 'zss/words/system'
import {
  applycolortoindexes,
  textformatreadedges,
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

  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  const [selection, setSelection] = useState<number | undefined>(undefined)
  const usemobiletextcapture = useDeviceData((s) => s.usemobiletextcapture)
  const editfocusopened = useRef(false)

  const tvalue = `${state} `
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // prefix
  const prefix = context.iseven ? '$dkgreen$onblack' : '$green$ondkgrey'
  tokenizeandwritetextformat(
    `${prefix} $20 $ondkblue ${tcolor}${tlabel} $green`,
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

  useEffect(() => {
    if (!focus) {
      editfocusopened.current = false
      return
    }
    if (!usemobiletextcapture || !value) {
      return
    }
    if (!editfocusopened.current) {
      editfocusopened.current = true
      mobiletextfocus()
      queueMicrotask(() => {
        const el = getmobiletextelement()
        if (!el || !value) {
          return
        }
        const s = value.toJSON()
        el.value = s
        el.setSelectionRange(s.length, s.length)
      })
    }
  }, [focus, usemobiletextcapture, value])

  useEffect(() => {
    if (!focus || !usemobiletextcapture || !value) {
      return
    }
    return onmobiletextinput((newstr, sel) => {
      const capped = newstr.slice(0, visiblerange)
      const prev = value.toJSON()
      value.splice(0, prev.length, capped)
      setCursor(clamp(sel, 0, capped.length))
      setSelection(undefined)
    })
  }, [focus, usemobiletextcapture, value, visiblerange])

  useEffect(() => {
    if (!focus || !usemobiletextcapture || !value) {
      return
    }
    const el = getmobiletextelement()
    if (!el || document.activeElement !== el) {
      return
    }
    const s = value.toJSON()
    el.value = s
    if (!ispresent(selection)) {
      el.setSelectionRange(cursor, cursor)
    } else {
      const l = Math.min(selection, cursor)
      let r = Math.max(selection, cursor)
      if (r !== l && r === cursor) {
        r--
      }
      el.setSelectionRange(l, r + 1)
    }
  }, [focus, usemobiletextcapture, state, cursor, selection, value])

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
