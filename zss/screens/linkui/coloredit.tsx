import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
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
import { UserFocus } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { pttoindex } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { clamp } from 'zss/mapping/number'
import { maptovalue } from 'zss/mapping/value'
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

function listaltnames(color: string) {
  switch (color) {
    case 'dkyellow':
      return ', brown'
    case 'ltgray':
      return ', ltgrey, gray, grey'
    case 'dkgray':
      return ', dkgrey, ltblack'
    case 'ondkyellow':
      return ', onbrown'
    case 'onltgray':
      return ', onltgrey, ongray, ongrey'
    case 'ondkgray':
      return ', ondkgrey, onltblack'
    case 'bldkyellow':
      return ', blbrown'
    case 'blltgray':
      return ', blltgrey, blgray, blgrey'
    case 'bldkgray':
      return ', bldkgrey, blltblack'
  }
  return ''
}

type LinkColorEditProps = LinkWidgetProps & { isbg?: boolean }

export function LinkColorEdit({ surface, isbg = false }: LinkColorEditProps) {
  linkbegin(surface)

  const target = maptovalue(surface.words[0], '')

  useHyperlinkSharedSync(
    isbg ? 'bgedit' : 'coloredit',
    surface.layout === 'terminal'
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

  const [focus, setfocus] = useState(surface.layout === 'panel')

  useLayoutEffect(() => {
    if (surface.layout === 'panel') {
      setfocus(true)
    }
  }, [surface.layout])

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$green$20 ${tcolor}${tlabel} $${colorname}$219$white ${tvalue} $7($27$26)`,
      surface.context,
      false,
    )
  } else {
    const tcoloralts = listaltnames(colorname).padEnd(32, ' ')
    const colors: string[] = [
      `$green${tlabel} ${tvalue} ${colorname}${tcoloralts}\n$white`,
    ]
    for (let i = 0; i < withlist.length; ++i) {
      if (i % EDIT_WIDTH === 0) {
        colors.push(`\n`)
      }
      const c = withlist[i]
      const ccolor = (COLOR[c] || COLOR[COLOR.BLACK]).toLowerCase()
      if (c > (COLOR.ONCLEAR as number)) {
        if (c === state) {
          colors.push(`$onwhite$${ccolor}$219`)
        } else {
          colors.push(`$onblack$${ccolor}$219`)
        }
      } else if (c === (COLOR.ONCLEAR as number)) {
        if (c === state) {
          colors.push(`$onyellow$blwhite$219`)
        } else {
          colors.push(`$onyellow$blblack$219`)
        }
      } else {
        if (c === state) {
          colors.push(`$onwhite$bl${ccolor}$219`)
        } else {
          colors.push(`$onblack$${ccolor}$219`)
        }
      }
    }
    colors.push(`$ondkblue$white`)
    colors.push(`\n\n`)
    colors.push(`$greenpress C to copy ${tvalue}`)
    colors.push(`\n\n`)
    colors.push(`$greenpress B to copy bits of ${tvalue}`)
    tokenizeandwritetextformat(colors.join(''), surface.context, true)
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

  const done = useCallback(() => {
    surface.sendclose()
  }, [surface])

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
          if (surface.layout === 'panel') {
            surface.sendclose()
          }
          break
        case 'b':
          copybits()
          if (surface.layout === 'panel') {
            surface.sendclose()
          }
          break
      }
    },
    [state, surface, copybits],
  )

  if (surface.layout === 'panel') {
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
        {focus && (
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
                if (clickidx >= 0 && clickidx <= 16) {
                  modemwritevaluenumber(address, clickidx)
                  surface.sendclose()
                }
              }}
            />
            <UserInput
              MOVE_LEFT={left}
              MOVE_UP={up}
              MOVE_RIGHT={right}
              MOVE_DOWN={down}
              OK_BUTTON={done}
              CANCEL_BUTTON={done}
              keydown={keydown}
            />
          </UserFocus>
        )}
      </group>
    )
  }

  return surface.active ? (
    <UserInput MOVE_LEFT={left} MOVE_RIGHT={right} keydown={keydown} />
  ) : null
}
