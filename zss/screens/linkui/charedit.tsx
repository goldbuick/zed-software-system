import { useCallback, useRef } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { registercopy } from 'zss/device/api'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { readcharfrombytes } from 'zss/feature/bytes'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { useMedia } from 'zss/gadget/media'
import { Rect } from 'zss/gadget/rect'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { pttoindex } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { useLinkEditCancelOnInactive } from 'zss/screens/linkui/linkeditcancel'
import {
  clearlinkeditingkey,
  readlinkeditingkey,
  setlinkeditingkey,
  useLinkEditingKey,
} from 'zss/screens/linkui/linkediting'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkbegin, linkmodemaddress } from './surface'
import type { LinkWidgetProps } from './types'

const SHORTCUT = 'a'
const EDIT_WIDTH = 32
const EDIT_HEIGHT = 8

const point = new Vector3()

function coords() {
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const px = Math.floor(point.x / cw)
  const py = Math.floor(point.y / ch)
  return {
    x: Math.round(EDIT_WIDTH * 0.5 + px),
    y: Math.round(EDIT_HEIGHT * 0.5 + py),
  }
}

export function LinkCharEdit({ surface }: LinkWidgetProps) {
  linkbegin(surface)

  const target = maptovalue(surface.words[0], '')

  useHyperlinkSharedSync(
    'charedit',
    surface.layout === 'terminal' && surface.modemprefix.trim().length > 0
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0
  const tvalue = `${state}`.padStart(3, '0')
  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)
  const badgetext = ` ${SHORTCUT.toUpperCase()} `
  const badgebg = surface.context.iseven ? '$black$onltgray' : '$black$ondkcyan'
  const summary = `${badgebg}${badgetext}${tcolor}$onclear ${tlabel} $${state}$white ${tvalue}${
    surface.layout === 'panel' && ispresent(surface.row) ? `\n` : ''
  }`

  const editing = useLinkEditingKey() === address
  const snapshot = useRef(state)

  const cancelediting = useCallback(() => {
    if (readlinkeditingkey() !== address) {
      return
    }
    modemwritevaluenumber(address, snapshot.current)
    clearlinkeditingkey(address)
  }, [address])

  const acceptediting = useCallback(() => {
    clearlinkeditingkey(address)
  }, [address])

  const enterediting = useCallback(() => {
    snapshot.current = state
    setlinkeditingkey(address)
  }, [address, state])

  const invokeediting = useCallback(() => {
    surface.setcursor?.(surface.striperow)
    enterediting()
  }, [surface, enterediting])

  useLinkEditCancelOnInactive(!!surface.active, cancelediting)

  if (editing) {
    const chars: string[] = [`${summary}\n$white`]
    for (let i = 0; i < 256; ++i) {
      if (i % EDIT_WIDTH === 0) {
        chars.push(`\n`)
      }
      if (i === state) {
        chars.push(`$blwhite$ongreen$${i}$white$ondkblue`)
      } else {
        chars.push(`$${i}`)
      }
    }
    chars.push(`\n\n`)
    chars.push(`$greenpress C to copy ${tvalue}`)
    chars.push(`\n\n`)
    chars.push(`$greenpress B to copy bits of ${tvalue}`)
    tokenizeandwritetextformat(chars.join(''), surface.context, true)
  } else {
    tokenizeandwritetextformat(summary, surface.context, false)
  }

  const left = useCallback(() => {
    if (state > 0) {
      modemwritevaluenumber(address, state - 1)
    }
  }, [address, state])

  const right = useCallback(() => {
    if (state < 255) {
      modemwritevaluenumber(address, state + 1)
    }
  }, [address, state])

  const up = useCallback(() => {
    if (state >= EDIT_WIDTH) {
      modemwritevaluenumber(address, state - EDIT_WIDTH)
    }
  }, [address, state])

  const down = useCallback(() => {
    if (state <= 255 - EDIT_WIDTH) {
      modemwritevaluenumber(address, state + EDIT_WIDTH)
    }
  }, [address, state])

  const copybits = useCallback(() => {
    const { charset } = useMedia.getState()
    let content = ''
    const bits = readcharfrombytes(charset, state)
    for (let i = 0; i < bits.length; ++i) {
      if (i % 8 === 0) {
        content += `@char${state} `
      }
      content += bits[i] ? 'X' : '-'
      if (i % 8 === 7) {
        content += '\n'
      }
    }
    registercopy(SOFTWARE, registerreadplayer(), content)
  }, [state])

  const keydown = useCallback(
    (event: KeyboardEvent) => {
      const lkey = event.key.toLowerCase()
      switch (lkey) {
        case 'c':
          registercopy(SOFTWARE, registerreadplayer(), `${state}`)
          break
        case 'b':
          copybits()
          break
      }
    },
    [state, copybits],
  )

  if (editing) {
    const cx = surface.context.x - 1
    const cy = surface.context.y + 2
    return (
      <group
        position={[
          cx * RUNTIME.DRAW_CHAR_WIDTH(),
          cy * RUNTIME.DRAW_CHAR_HEIGHT(),
          1,
        ]}
      >
        <UserFocus blockhotkeys>
          <Rect
            x={1}
            blocking
            visible={false}
            cursor="pointer"
            width={EDIT_WIDTH}
            height={EDIT_HEIGHT}
            onClick={(e: any) => {
              e.intersections[0].object.worldToLocal(
                point.copy(e.intersections[0].point),
              )
              const idx = pttoindex(coords(), EDIT_WIDTH)
              if (idx >= 0 && idx <= 255) {
                modemwritevaluenumber(address, idx)
                acceptediting()
              }
            }}
          />
          <UserInput
            MOVE_LEFT={left}
            MOVE_UP={up}
            MOVE_RIGHT={right}
            MOVE_DOWN={down}
            OK_BUTTON={acceptediting}
            CANCEL_BUTTON={cancelediting}
            keydown={keydown}
          />
        </UserFocus>
      </group>
    )
  }

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
          width={badgetext.length + 0.5}
          height={1.5}
          blocking
          onClick={invokeediting}
        />
        {surface.active && <UserInput OK_BUTTON={enterediting} />}
        <UserHotkey hotkey={SHORTCUT}>{invokeediting}</UserHotkey>
      </group>
    )
  }

  return (
    <>
      {surface.active && <UserInput OK_BUTTON={enterediting} />}
      <UserHotkey hotkey={SHORTCUT}>{invokeediting}</UserHotkey>
    </>
  )
}
