import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { modemwriteinitstring } from 'zss/device/modem'
import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
} from 'zss/feature/bookmarks'
import { useGadgetClient, useTape } from 'zss/gadget/data/state'
import { PANEL_ITEM, paneladdress } from 'zss/gadget/data/types'
import { Scrollable } from 'zss/gadget/scrollable'
import { useTiles } from 'zss/gadget/tiles'
import { UserFocus, UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { TilesData } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import { animpositiontotarget } from 'zss/mapping/anim'
import { clamp } from 'zss/mapping/number'
import { isarray, ispresent } from 'zss/mapping/types'
import { useShallow } from 'zustand/react/shallow'
import { ScrollContext } from 'zss/screens/panel/common'
import { PanelComponent } from 'zss/screens/panel/component'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ScrollBackPlate } from './backplate'
import { ScrollControls } from './controls'
import { ScrollCursor } from './cursor'
import { ScrollMarquee } from './marquee'

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

  // get name
  const scrollname = useGadgetClient((state) => state.gadget.scrollname ?? '')
  const gadgetboard = useGadgetClient((state) => state.gadget.board ?? '')
  const { editoropen, editorbook } = useTape(
    useShallow((state) => ({
      editoropen: state.editor.open,
      editorbook: state.editor.book,
    })),
  )

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

  useEffect(() => {
    if (scrollname !== BOOKMARK_SCROLL_SCROLLNAME) {
      return
    }
    const parts: string[] = []
    if (editoropen && editorbook.trim()) {
      parts.push(editorbook.trim())
    }
    if (gadgetboard.trim()) {
      parts.push(gadgetboard.trim())
    }
    const defaultname = parts.join(' / ')
    modemwriteinitstring(
      paneladdress(BOOKMARK_SCROLL_CHIP, BOOKMARK_NAME_TARGET),
      defaultname,
    )
  }, [scrollname, editoropen, editorbook, gadgetboard])

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
                line={`
keys: $whiteup/down$green.SCROLL UP/DOWN 
$whiteesc/cancel$green.CLOSE SCROLL 
$whiteenter$green.ACTION ON SELECTED LINE 
$whitealt+up/down$green.JUMP 10 LINES 
$white$meta+up/down$green.JUMP TOP/BOTTOM $blue
`}
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
