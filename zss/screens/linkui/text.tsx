import { useEffect, useRef, useState } from 'react'
import { useWaitForValueString } from 'zss/device/modemhooks'
import { withclipboard } from 'zss/feature/keyboard'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { useDeviceData } from 'zss/gadget/device'
import {
  getmobiletextelement,
  mobiletextfocus,
  onmobiletextinput,
} from 'zss/gadget/mobiletext'
import { UserFocus } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import type { UserInputMods } from 'zss/gadget/userinputtypes'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { drawblockcursor } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import { ismac } from 'zss/words/system'
import {
  applycolortoindexes,
  textformatreadedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { linkbegin, linkmodemaddress, linkpanelstripe } from './surface'
import type { LinkWidgetProps } from './types'

export function LinkText({ surface }: LinkWidgetProps) {
  linkbegin(surface)

  const target = maptovalue(surface.words[0], '')

  useHyperlinkSharedSync(
    'text',
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueString(address)
  const state = value?.toJSON() ?? ''

  const [cursor, setcursor] = useState(0)
  const [focus, setfocus] = useState(false)
  const [selection, setselection] = useState<number | undefined>(undefined)
  const usemobiletextcapture = useDeviceData((s) => s.usemobiletextcapture)
  const editfocusopened = useRef(false)

  const tvalue = `${state} `
  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)
  const stripe = surface.layout === 'panel' ? linkpanelstripe(surface) : ''

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$green $20 ${tcolor}${tlabel} $green`,
      surface.context,
      false,
    )
  } else {
    tokenizeandwritetextformat(
      `${stripe} $20 ${tcolor}${tlabel} $green`,
      surface.context,
      false,
    )
  }

  const tx = surface.context.x
  const ty = surface.context.y
  const tyw = ty * surface.context.width

  surface.context.writefullwidth = 32
  tokenizeandwritetextformat(`${stripe}${tvalue}`, surface.context, false)
  surface.context.writefullwidth = undefined

  const hasselection = ispresent(selection)
  const visiblerange = surface.context.width - tx - 2
  const left = hasselection ? Math.min(selection, cursor) : cursor
  let right = hasselection ? Math.max(selection, cursor) : cursor
  if (hasselection) {
    if (right !== left && right === cursor) {
      --right
    }
    applycolortoindexes(
      tx + left + tyw,
      tx + right + tyw,
      15,
      8,
      surface.context,
    )
  }
  if (focus) {
    const edge = textformatreadedges(surface.context)
    drawblockcursor(cursor, 0, { ...edge, left: tx, top: ty }, surface.context)
  }

  function deleteselection() {
    if (ispresent(value)) {
      setcursor(left)
      setselection(undefined)
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
      setcursor(clamp(sel, 0, capped.length))
      setselection(undefined)
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
      {surface.active && (
        <UserInput
          OK_BUTTON={() => {
            // Y.Text handle may exist with empty content; only skip when missing
            if (ispresent(value)) {
              setfocus(true)
              setcursor(value.length)
              setselection(undefined)
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
                  setselection(clamp(cursor - 1, 0, state.length))
                }
              } else {
                setselection(undefined)
              }
              setcursor((c) => clamp(c - 1, 0, state.length))
            }}
            MOVE_RIGHT={(mods) => {
              if (mods.shift) {
                if (!ispresent(selection)) {
                  setselection(cursor)
                }
              } else {
                setselection(undefined)
              }
              setcursor((c) => clamp(c + 1, 0, state.length))
            }}
            CANCEL_BUTTON={() => {
              setfocus(false)
              setcursor(state.length)
              setselection(undefined)
            }}
            OK_BUTTON={() => setfocus(false)}
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
              const statelen = value.toJSON().length

              switch (lkey) {
                case 'delete':
                  if (hasselection) {
                    deleteselection()
                  } else if (statelen > 0) {
                    value.delete(cursor, 1)
                  }
                  break
                case 'backspace':
                  if (hasselection) {
                    deleteselection()
                  } else if (cursor > 0) {
                    value.delete(cursor - 1, 1)
                    setcursor((c) => Math.max(0, c - 1))
                  }
                  break
                default:
                  if (mods.ctrl) {
                    switch (lkey) {
                      case 'a':
                        setselection(0)
                        setcursor(statelen)
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
                              setcursor(cursor + text.length)
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
                  } else if (surface.layout === 'panel' && mods.alt) {
                    // no-op ?? - could this shove text around ??
                  } else if (
                    event.key.length === 1 &&
                    statelen < visiblerange
                  ) {
                    value.insert(cursor, event.key)
                    setcursor((c) => c + 1)
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
