/* eslint-disable react/no-unknown-property */
import { useCallback, useContext, useLayoutEffect, useState } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { registercopy } from 'zss/device/api'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { paneladdress } from 'zss/gadget/data/types'
import { useBlink, useMedia } from 'zss/gadget/hooks'
import { Rect } from 'zss/gadget/rect'
import { UserFocus, UserInput } from 'zss/gadget/userinput'
import { pttoindex } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { clamp } from 'zss/mapping/number'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

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

const colormap: number[] = [...range(0, 15), ...range(33, 48)]
const bgmap: number[] = [...range(0, 15), 32]

export function PanelColorEdit({
  sidebar,
  chip,
  row,
  label,
  args,
  context,
  isbg = false,
}: PanelItemProps & { isbg?: boolean }) {
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

  const withlist = isbg ? bgmap : colormap
  const idx = withlist.indexOf(state)

  const tvalue = `${state}`.padStart(2, '0')
  const tlabel = label.trim()
  const tcolor = (COLOR[state] || COLOR[COLOR.BLACK]).toLowerCase()
  const tcoloralts = listaltnames(tcolor).padEnd(32, ' ')

  const cx = context.x - 1
  const cy = context.y + 2

  const colors: string[] = [
    `$green${tlabel} ${tvalue} ${tcolor}${tcoloralts}\n$white`,
  ]
  for (let i = 0; i < withlist.length; ++i) {
    if (i % EDIT_WIDTH === 0) {
      colors.push(`\n`)
    }
    const c = withlist[i]
    const ccolor = (COLOR[c] || COLOR[COLOR.BLACK]).toLowerCase()
    if (c === state) {
      if (blink) {
        const alt = i % 16 < 8 ? `white` : `black`
        colors.push(c > 32 ? `$onwhite$219` : `$${alt}$219`)
      } else {
        colors.push(`$onblack$${ccolor}$219`)
      }
    } else {
      colors.push(`$onblack$${ccolor}$219`)
    }
  }
  colors.push(`$white`)
  colors.push(`\n\n`)
  colors.push(`$greenpress C to copy ${tvalue}`)
  colors.push(`\n\n`)
  colors.push(`$greenpress B to copy bits of ${tvalue}`)

  tokenizeandwritetextformat(colors.join(''), context, true)

  const scroll = useContext(ScrollContext)

  const update = useCallback(
    (i: number) => {
      const value = withlist[clamp(i, 0, withlist.length - 1)]
      modemwritevaluenumber(address, value)
    },
    [withlist, address],
  )

  const up = useCallback(() => {
    update(idx - EDIT_WIDTH)
  }, [update, idx])

  const left = useCallback(() => {
    update(idx - 1)
  }, [update, idx])

  const right = useCallback(() => {
    update(idx + 1)
  }, [update, idx])

  const down = useCallback(() => {
    update(idx + EDIT_WIDTH)
  }, [update, idx])

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
            keydown={(event) => {
              const lkey = event.key.toLowerCase()
              switch (lkey) {
                case 'c':
                  registercopy(SOFTWARE, registerreadplayer(), `${state}`)
                  scroll.sendclose()
                  break
                case 'b': {
                  if (state !== (COLOR.ONCLEAR as number)) {
                    const idx =
                      state < (COLOR.ONCLEAR as number)
                        ? state
                        : state - (COLOR.BLBLACK as number)
                    const color = useMedia.getState().palettedata?.[idx]
                    const r = Math.round((color?.r ?? 0) * 255)
                    const g = Math.round((color?.g ?? 0) * 255)
                    const b = Math.round((color?.b ?? 0) * 255)
                    const content = `@color${idx} ${r} ${g} ${b}`
                    // copy as @color1 XXXX stats
                    registercopy(SOFTWARE, registerreadplayer(), content)
                    scroll.sendclose()
                  }
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
