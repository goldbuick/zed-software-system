import { useFrame, useThree } from '@react-three/fiber'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { Scrollable } from 'zss/gadget/scrollable'
import { useTiles } from 'zss/gadget/tiles'
import { UserFocus, UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { TilesData } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import { animpositiontotarget } from 'zss/mapping/anim'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { ScrollContext } from 'zss/screens/panel/common'
import { PanelComponent } from 'zss/screens/panel/component'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ScrollBackPlate } from './backplate'
import { useBookmarkDefaultNameSync } from './bookmarkdefaultname'
import { ScrollControls } from './controls'
import { ScrollCursor } from './cursor'
import { ScrollMarquee } from './marquee'
import { SCROLL_KEY_HINTS_LINE } from './scrollkeyhints'
import { scrollpickstarthyperlinkrow } from './scrollpick'

type ScrollComponentProps = {
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
  shouldclose: boolean
  didclose?: () => void
}

export function ScrollComponent({
  width,
  height,
  color,
  bg,
  text,
  shouldclose,
}: ScrollComponentProps) {
  const { viewport } = useThree()
  const panelwidth = width - 3
  const panelheight = height - 3
  const tilesstore = useTiles(width, height, 0, color, bg)
  const scroll = useContext(ScrollContext)
  const totalrows = text.length - 1

  const scrollname = useGadgetClient((state) => state.gadget.scrollname ?? '')
  const boardname = useGadgetClient((state) => state.gadget.boardname ?? '')

  const context: WRITE_TEXT_CONTEXT = useMemo(
    () => ({
      ...createwritetextcontext(width, height, color, bg, 0, 0, width, height),
      ...tilesstore.getState(),
    }),
    [bg, color, height, tilesstore, width],
  )

  const [cursor, setCursor] = useState(() => scrollpickstarthyperlinkrow(text))

  useEffect(() => {
    setCursor(
      clamp(scrollpickstarthyperlinkrow(text), 0, Math.max(0, text.length - 1)),
    )
  }, [text])

  let offset = cursor - Math.floor(panelheight * 0.5)
  offset = Math.min(text.length - panelheight, offset)
  offset = Math.max(0, offset)

  const visibletext = useMemo(
    () => text.slice(offset, offset + panelheight),
    [text, offset, panelheight],
  )

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

  useBookmarkDefaultNameSync(scrollname, boardname)

  useEffect(() => {
    if (groupref.current && !shouldclose) {
      const start = viewport.height
      groupref.current.position.y = start
      groupref.current.userData.y = start
      groupref.current.userData.vy = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldclose])

  useFrame(
    useCallback(
      (_, delta) => {
        if (ispresent(groupref.current)) {
          const target = shouldclose
            ? height * 2 * -RUNTIME.DRAW_CHAR_HEIGHT()
            : 0
          if (animpositiontotarget(groupref.current, 'y', target, delta)) {
            didstop()
          }
        }
      },
      [shouldclose, didstop, height],
    ),
  )

  return (
    <group ref={groupref} position-y={1000000}>
      {/* Wheel hit target outside UserFocus so trackpad scroll works without nesting focus. */}
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
          <WriteTextContext.Provider value={context}>
            <ScrollBackPlate name={scrollname} width={width} height={height} />
            <ScrollControls
              row={row}
              width={width}
              height={height}
              panelwidth={panelwidth}
              panelheight={panelheight}
            >
              <ScrollMarquee
                margin={3}
                color={COLOR.BLUE}
                y={0}
                leftedge={0}
                rightedge={width}
                line={SCROLL_KEY_HINTS_LINE}
              />
              <ScrollCursor row={row} />
              <PanelComponent
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
          </WriteTextContext.Provider>
        </TilesData>
      </UserFocus>
    </group>
  )
}
