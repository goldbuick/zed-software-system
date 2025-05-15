import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { animpositiontotarget } from 'zss/mapping/anim'
import { isarray, ispresent } from 'zss/mapping/types'
import {
  createwritetextcontext,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { PANEL_ITEM } from '../data/types'
import { useTiles } from '../hooks'
import { ScrollContext } from '../panel/common'
import { Panel } from '../panel/component'
import { UserFocus, UserInput, UserInputHandler } from '../userinput'
import { TilesData } from '../usetiles'

import { ScrollBackPlate } from './backplate'
import { ScrollControls } from './controls'
import { Marquee } from './marquee'

type ScrollProps = {
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
  shouldclose: boolean
  didclose?: () => void
}

export function Scroll({
  name,
  width,
  height,
  color,
  bg,
  text,
  shouldclose,
}: ScrollProps) {
  const { viewport } = useThree()
  const panelwidth = width - 3
  const panelheight = height - 3
  const tilesstore = useTiles(width, height, 0, color, bg)
  const scroll = useContext(ScrollContext)

  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, color, bg, 0, 0, width, height),
    ...tilesstore.getState(),
  }

  // input cursor
  const [cursor, setCursor] = useState(() => {
    // calc default
    const startat = text.findIndex((item) => isarray(item))
    return startat >= 0 && startat <= 8 ? startat : 0
  })

  // display offset
  let offset = cursor - Math.floor(panelheight * 0.5)
  offset = Math.min(text.length - panelheight, offset)
  offset = Math.max(0, offset)

  const visibletext = text.slice(offset, offset + panelheight)

  // update dither
  const row = cursor - offset

  const groupref = useRef<Group>(null)

  const didstop = useCallback(() => {
    if (shouldclose) {
      scroll.didclose()
    }
  }, [shouldclose, scroll])

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setCursor((state) => Math.max(0, state - step))
    },
    [setCursor],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setCursor((state) => Math.min(text.length, state + step))
    },
    [setCursor, text.length],
  )

  // start position
  useEffect(() => {
    if (groupref.current && !shouldclose) {
      const start = viewport.height
      groupref.current.position.y = start
      groupref.current.userData.y = start
      groupref.current.userData.vy = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldclose])

  // slick move
  useFrame(
    useCallback(
      (_, delta) => {
        if (ispresent(groupref.current)) {
          const target = shouldclose
            ? height * 2 * -RUNTIME.DRAW_CHAR_HEIGHT()
            : 0
          if (animpositiontotarget(groupref.current, 'y', target, delta)) {
            // signal completion
            didstop()
          }
        }
      },
      [shouldclose, didstop, height],
    ),
  )

  return (
    <group ref={groupref} position-y={1000000}>
      <UserFocus>
        <UserInput
          MOVE_UP={up}
          MOVE_DOWN={down}
          CANCEL_BUTTON={scroll.sendclose}
        />
        <TilesData store={tilesstore}>
          <ScrollBackPlate
            name={name}
            width={width}
            height={height}
            context={context}
          />
          <Marquee
            margin={3}
            color={COLOR.BLUE}
            y={0}
            leftedge={0}
            rightedge={width - 1}
            line={`
   up/down$white.SCROLL UP/DOWN   $blue
esc/cancel$white.CLOSE SCROLL   $blue
alt+up/down$white.JUMP 10 LINES   $blue
`}
            context={context}
          />
          <ScrollControls
            row={row}
            width={width}
            height={height}
            panelwidth={panelwidth}
            panelheight={panelheight}
          >
            <Panel
              name={name}
              width={panelwidth}
              height={panelheight}
              xmargin={0}
              ymargin={0}
              color={color}
              bg={COLOR.ONCLEAR}
              text={visibletext}
              selected={row}
            />
          </ScrollControls>
        </TilesData>
      </UserFocus>
    </group>
  )
}
