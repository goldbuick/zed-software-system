import { useCallback, useContext, useLayoutEffect, useState } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { pttoindex } from 'zss/mapping/2d'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { paneladdress } from '../data/types'
import { useBlink } from '../hooks'
import { Rect } from '../rect'
import { UserFocus, UserInput } from '../userinput'

import { PanelItemProps, ScrollContext, setuppanelitem } from './common'

const EDIT_WIDTH = 8
const EDIT_HEIGHT = 2

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

export function PanelItemColorEdit({
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

  const tvalue = `${state}`.padStart(2, '0')
  const tlabel = label.trim()
  const tcolor = (COLOR[state] || COLOR[COLOR.BLACK])
    .padEnd(12, ' ')
    .toLowerCase()

  const cx = context.x - 1
  const cy = context.y + 2

  const chars: string[] = [`$green${tlabel} ${tvalue} ${tcolor}\n$white`]
  for (let i = 0; i < 16; ++i) {
    if (i % EDIT_WIDTH === 0) {
      chars.push(`\n`)
    }
    if (i === state) {
      const alt = i < 8 ? `$white` : `$black`
      const highlight = blink ? alt : `$${COLOR[i]}`
      chars.push(`${highlight}$219`)
    } else {
      chars.push(`$${COLOR[i]}$219`)
    }
  }
  chars.push(`$white`)

  tokenizeandwritetextformat(chars.join(''), context, true)

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
    if (state < 15) {
      modemwritevaluenumber(address, state + 1)
    }
  }, [address, state])

  const down = useCallback(() => {
    if (state <= 15 - EDIT_WIDTH) {
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
              const pt = coords()
              const idx = pttoindex(pt, EDIT_WIDTH)
              if (idx >= 0 && idx <= 16) {
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
