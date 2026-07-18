import { useCallback, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { registercopy } from 'zss/device/api'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { useMedia } from 'zss/gadget/media'
import { Rect } from 'zss/gadget/rect'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { pttoindex } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { clamp } from 'zss/mapping/number'
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
import { COLOR } from 'zss/words/types'

import { linkbegin, linkmodemaddress } from './surface'
import type { LinkWidgetProps } from './types'

const EDIT_WIDTH = 8
const EDIT_HEIGHT = 2

const colormap: number[] = [...range(0, 15), ...range(33, 48)]
const bgmap: number[] = [...range(0, 15), 32]

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

type LinkColorEditProps = LinkWidgetProps & { isbg?: boolean }

export function LinkColorEdit({ surface, isbg = false }: LinkColorEditProps) {
  linkbegin(surface)

  const shortcut = isbg ? 'b' : 'c'
  const target = maptovalue(surface.words[0], '')

  useHyperlinkSharedSync(
    isbg ? 'bgedit' : 'coloredit',
    surface.layout === 'terminal' && surface.modemprefix.trim().length > 0
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const withlist = useMemo(() => (isbg ? bgmap : colormap), [isbg])
  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0
  const idx = useMemo(() => {
    const i = withlist.indexOf(state)
    return i >= 0 ? i : 0
  }, [withlist, state])

  const tvalue = `${state}`.padStart(2, '0')
  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)
  const colorname = (COLOR[state] || COLOR[COLOR.BLACK]).toLowerCase()
  const badgetext = ` ${shortcut.toUpperCase()} `
  const badgebg = surface.context.iseven ? '$black$onltgray' : '$black$ondkcyan'
  const summary = `${badgebg}${badgetext}${tcolor}$onclear ${tlabel} $${colorname}$219$white ${tvalue} ${colorname}${
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
    const colors: string[] = [`${summary}\n$white`]
    for (let i = 0; i < withlist.length; ++i) {
      if (i % EDIT_WIDTH === 0) {
        colors.push(`\n`)
      }
      const c = withlist[i]
      const ccolor = (COLOR[c] || COLOR[COLOR.BLACK]).toLowerCase()
      if (c > (COLOR.ONCLEAR as number)) {
        if (c === state) {
          colors.push(`$onwhite$${ccolor}$219$ondkblue$white`)
        } else {
          colors.push(`$onblack$${ccolor}$219$ondkblue$white`)
        }
      } else if (c === (COLOR.ONCLEAR as number)) {
        if (c === state) {
          colors.push(`$onyellow$blwhite$219$ondkblue$white`)
        } else {
          colors.push(`$onyellow$blblack$219$ondkblue$white`)
        }
      } else {
        if (c === state) {
          colors.push(`$onwhite$bl${ccolor}$219$ondkblue$white`)
        } else {
          colors.push(`$onblack$${ccolor}$219$ondkblue$white`)
        }
      }
    }
    colors.push(`\n\n`)
    colors.push(`$greenpress C to copy ${tvalue}`)
    colors.push(`\n\n`)
    colors.push(`$greenpress B to copy bits of ${tvalue}`)
    tokenizeandwritetextformat(colors.join(''), surface.context, true)
  } else {
    tokenizeandwritetextformat(summary, surface.context, false)
  }

  const update = useCallback(
    (nextidx: number) => {
      const v = withlist[clamp(nextidx, 0, withlist.length - 1)]
      modemwritevaluenumber(address, v)
    },
    [withlist, address],
  )

  const left = useCallback(() => {
    update(idx - 1)
  }, [update, idx])

  const right = useCallback(() => {
    update(idx + 1)
  }, [update, idx])

  const up = useCallback(() => {
    update(idx - EDIT_WIDTH)
  }, [update, idx])

  const down = useCallback(() => {
    update(idx + EDIT_WIDTH)
  }, [update, idx])

  const copybits = useCallback(() => {
    if (state === (COLOR.ONCLEAR as number)) {
      return
    }
    const cidx =
      state < (COLOR.ONCLEAR as number)
        ? state
        : state - (COLOR.BLBLACK as number)
    const color = useMedia.getState().palettedata?.[cidx]
    const r = Math.round((color?.r ?? 0) * 255)
    const g = Math.round((color?.g ?? 0) * 255)
    const b = Math.round((color?.b ?? 0) * 255)
    const content = `@color${cidx} ${r} ${g} ${b}`
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
              const pt = coords()
              const clickidx = pttoindex(pt, EDIT_WIDTH)
              if (clickidx >= 0 && clickidx < withlist.length) {
                modemwritevaluenumber(address, withlist[clickidx])
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
        <UserHotkey hotkey={shortcut}>{invokeediting}</UserHotkey>
      </group>
    )
  }

  return (
    <>
      {surface.active && <UserInput OK_BUTTON={enterediting} />}
      <UserHotkey hotkey={shortcut}>{invokeediting}</UserHotkey>
    </>
  )
}
