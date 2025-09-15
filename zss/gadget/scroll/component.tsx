import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { animpositiontotarget } from 'zss/mapping/anim'
import { clamp } from 'zss/mapping/number'
import { isarray, ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { useGadgetClient } from '../gadget/data/state'
import { PANEL_ITEM } from '../gadget/data/types'
import { useTiles } from '../gadget/hooks'
import { ScrollContext } from '../gadget/panel/common'
import { Panel } from '../gadget/panel/component'
import { Scrollable } from '../gadget/scrollable'
import { UserFocus, UserInput, UserInputHandler } from '../gadget/userinput'
import { TilesData } from '../gadget/usetiles'

import { ScrollBackPlate } from './backplate'
import { ScrollControls } from './controls'
import { Marquee } from './marquee'

type ScrollProps = {
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
  shouldclose: boolean
  didclose?: () => void
}

export function Scroll({
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
  const totalrows = text.length - 1

  // get name
  const scrollname = useGadgetClient((state) => state.gadget.scrollname ?? '')

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
      const step = mods.ctrl ? totalrows : mods.alt ? 10 : 1
      setCursor((state) => Math.max(0, state - step))
    },
    [setCursor, totalrows],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.ctrl ? totalrows : mods.alt ? 10 : 1
      setCursor((state) => Math.min(totalrows, state + step))
    },
    [setCursor, totalrows],
  )

  const movecursor = useCallback(
    (value: number) => {
      setCursor((state) => clamp(Math.round(state + value), 0, totalrows))
    },
    [setCursor, totalrows],
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
      <Scrollable
        blocking
        x={0}
        y={0}
        width={width}
        height={height}
        onScroll={(ydelta: number) => movecursor(ydelta * 0.5)}
      />
      <UserFocus>
        <UserInput
          MOVE_UP={up}
          MOVE_DOWN={down}
          CANCEL_BUTTON={scroll.sendclose}
        />
        <TilesData store={tilesstore}>
          <ScrollBackPlate
            name={scrollname}
            width={width}
            height={height}
            context={context}
          />
          <Marquee
            margin={3}
            color={COLOR.BLUE}
            y={0}
            leftedge={0}
            rightedge={width}
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
