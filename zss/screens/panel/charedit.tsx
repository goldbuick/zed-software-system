/* eslint-disable react/no-unknown-property */
import { useCallback, useContext, useLayoutEffect, useState } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { registercopy } from 'zss/device/api'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { readcharfrombytes } from 'zss/feature/bytes'
import { paneladdress } from 'zss/gadget/data/types'
import { useBlink, useMedia } from 'zss/gadget/hooks'
import { Rect } from 'zss/gadget/rect'
import { UserFocus, UserInput } from 'zss/gadget/userinput'
import { pttoindex } from 'zss/mapping/2d'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { PanelItemProps, ScrollContext, setuppanelitem } from './common'

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

export function PanelCharEdit({
  sidebar,
  chip,
  row,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const [target] = [maptovalue(args[0], '')]

  // state
  const address = paneladdress(chip, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0

  const blink = useBlink()
  const [focus, setfocus] = useState(false)

  useLayoutEffect(() => {
    setfocus(true)
  }, [])

  const tvalue = `${state}`.padStart(3, '0')
  const tlabel = label.trim()

  const cx = context.x - 1
  const cy = context.y + 2

  const chars: string[] = [`$green${tlabel} ${tvalue}\n$white`]
  for (let i = 0; i < 256; ++i) {
    if (i % EDIT_WIDTH === 0) {
      chars.push(`\n`)
    }
    if (i === state) {
      const highlight = blink ? `$green$onwhite` : `$white$ongreen`
      chars.push(`${highlight}$${i}$white$ondkblue`)
    } else {
      chars.push(`$${i}`)
    }
  }
  chars.push(`\n\n`)
  chars.push(`$greenpress C to copy ${tvalue}`)
  chars.push(`\n\n`)
  chars.push(`$greenpress B to copy bits of ${tvalue}`)

  const charpanel = chars.join('')
  tokenizeandwritetextformat(charpanel, context, true)

  const scroll = useContext(ScrollContext)

  const up = useCallback(() => {
    if (state >= EDIT_WIDTH) {
      modemwritevaluenumber(address, state - EDIT_WIDTH)
    }
  }, [address, state])

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

  const down = useCallback(() => {
    if (state <= 255 - EDIT_WIDTH) {
      modemwritevaluenumber(address, state + EDIT_WIDTH)
    }
  }, [address, state])

  const done = useCallback(() => {
    scroll.sendclose()
  }, [scroll])

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
                scroll.sendclose()
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
            keydown={(event) => {
              const lkey = event.key.toLowerCase()
              switch (lkey) {
                case 'c':
                  registercopy(SOFTWARE, registerreadplayer(), `${state}`)
                  scroll.sendclose()
                  break
                case 'b': {
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
                  // copy as @char1 XXXX stats
                  registercopy(SOFTWARE, registerreadplayer(), content)
                  scroll.sendclose()
                  break
                }
              }
            }}
          />
        </UserFocus>
      )}
    </group>
  )
}
