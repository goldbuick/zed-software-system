import { useCallback, useLayoutEffect, useState } from 'react'
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
import { UserFocus } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { pttoindex } from 'zss/mapping/2d'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkbegin, linkmodemaddress } from './surface'
import type { LinkWidgetProps } from './types'

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
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0
  const tvalue = `${state}`.padStart(3, '0')
  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)

  const [focus, setfocus] = useState(surface.layout === 'panel')

  useLayoutEffect(() => {
    if (surface.layout === 'panel') {
      setfocus(true)
    }
  }, [surface.layout])

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$green$20 ${tcolor}${tlabel} $white${tvalue} $7($27$26$2411 $24$25$241${EDIT_WIDTH})`,
      surface.context,
      false,
    )
  } else {
    const chars: string[] = [`$green${tlabel} ${tvalue}\n$white`]
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

  const done = useCallback(() => {
    surface.sendclose()
  }, [surface])

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
                const idx = pttoindex(coords(), EDIT_WIDTH)
                if (idx >= 0 && idx <= 255) {
                  modemwritevaluenumber(address, idx)
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
    <UserInput
      MOVE_LEFT={left}
      MOVE_RIGHT={right}
      MOVE_UP={up}
      MOVE_DOWN={down}
      keydown={keydown}
    />
  ) : null
}
