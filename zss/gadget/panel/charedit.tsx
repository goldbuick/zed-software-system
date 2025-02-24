import { useCallback, useContext, useLayoutEffect, useState } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { pttoindex } from 'zss/mapping/2d'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { paneladdress } from '../data/types'
import { useBlink } from '../hooks'
import { Rect } from '../rect'
import { UserFocus, UserInput } from '../userinput'

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
    x: EDIT_WIDTH * 0.5 + px,
    y: EDIT_HEIGHT * 0.5 + py,
  }
}

export function PanelItemCharEdit({
  chip,
  row,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(row, context)

  const [target] = [maptovalue(args[0], '')]

  // state
  const address = paneladdress(chip, target)
  const modem = useWaitForValueNumber(address)
  const value = modem?.value
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
            blocking
            visible={false}
            width={EDIT_WIDTH}
            height={EDIT_HEIGHT}
            onClick={(e) => {
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
          />
        </UserFocus>
      )}
    </group>
  )
}
