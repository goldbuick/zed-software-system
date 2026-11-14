import { useCallback, useContext, useMemo, useState } from 'react'
import { Color } from 'three'
import { RUNTIME } from 'zss/config'
import { useDeviceData } from 'zss/gadget/device'
import { Rect } from 'zss/gadget/rect'
import { useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import { ScrollContext } from 'zss/screens/panel/common'
import { PanelComponent } from 'zss/screens/panel/component'
import { ScreenUIFramed } from 'zss/screens/screenui/framed'
import { useGadgetInputBlocked } from 'zss/screens/screenui/gadgetinputblocked'
import { SidebarBackPlate } from 'zss/screens/screenui/sidebarbackplate'
import { SidebarCursor } from 'zss/screens/screenui/sidebarcursor'
import {
  SIDEBAR_SLIDE_CLOSE_VELOCITY,
  SIDEBAR_SLIDE_MAX_SPEED,
  SIDEBAR_SLIDE_OPEN_VELOCITY,
} from 'zss/screens/scroll/anim'
import { PanelSlide } from 'zss/screens/scroll/panelslide'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { RECT, RECT_TYPE, useScreenUILayoutContext } from './layoutstate'

const SCREEN_BACKDROP_COLOR = new Color(0.076, 0.076, 0)

type LayoutRectProps = {
  rect: RECT
}

function SidebarPanel({ rect, slide }: { rect: RECT; slide: boolean }) {
  const parent = useContext(ScrollContext)
  const [selected, setselected] = useState(-1)
  const sidebarclosing = useDeviceData((state) => state.sidebarclosing)
  const setcursor = useCallback((index: number) => {
    setselected(index)
  }, [])
  const scroll = useMemo(
    () => ({
      sendmessage: parent.sendmessage,
      sendclose: parent.sendclose,
      didclose: parent.didclose,
      setcursor,
    }),
    [parent.didclose, parent.sendclose, parent.sendmessage, setcursor],
  )

  const tilesstore = useTiles(
    rect.width,
    rect.height,
    0,
    COLOR.WHITE,
    COLOR.DKBLUE,
  )
  const context: WRITE_TEXT_CONTEXT = useMemo(
    () => ({
      ...createwritetextcontext(
        rect.width,
        rect.height,
        COLOR.WHITE,
        COLOR.DKBLUE,
        0,
        0,
        rect.width - 1,
        rect.height - 1,
      ),
      ...tilesstore.getState(),
    }),
    [rect.height, rect.width, tilesstore],
  )

  const chrome = (
    <TilesData store={tilesstore}>
      <TilesRender
        label="sidebar"
        width={rect.width}
        height={rect.height}
        mediasource="board"
        skipraycast
      />
      <WriteTextContext.Provider value={context}>
        <SidebarBackPlate width={rect.width} height={rect.height} />
        {selected >= 0 ? <SidebarCursor row={selected} /> : null}
        <PanelComponent
          width={rect.width}
          height={rect.height}
          color={COLOR.WHITE}
          bg={COLOR.ONCLEAR}
          text={rect.text}
          xmargin={1}
          ymargin={0}
          selected={selected}
          mediasource="board"
          onselectrow={setcursor}
        />
      </WriteTextContext.Provider>
    </TilesData>
  )

  function finishclose() {
    setselected(-1)
    useDeviceData.setState((state) => ({
      ...state,
      sidebarclosing: false,
    }))
  }

  if (slide) {
    return (
      <ScrollContext.Provider value={scroll}>
        <group position-z={512}>
          <PanelSlide
            shouldclose={sidebarclosing}
            fromright
            openvelocity={SIDEBAR_SLIDE_OPEN_VELOCITY}
            closevelocity={SIDEBAR_SLIDE_CLOSE_VELOCITY}
            maxspeed={SIDEBAR_SLIDE_MAX_SPEED}
            onclosed={finishclose}
          >
            {chrome}
          </PanelSlide>
        </group>
      </ScrollContext.Provider>
    )
  }

  return (
    <ScrollContext.Provider value={scroll}>
      <group position-z={512}>{chrome}</group>
    </ScrollContext.Provider>
  )
}

function LayoutRect({ rect }: LayoutRectProps) {
  const showtouchcontrols = useDeviceData((state) => state.showtouchcontrols)

  switch (rect.type) {
    case RECT_TYPE.PANEL: {
      if (rect.name === 'sidebar') {
        return <SidebarPanel rect={rect} slide={showtouchcontrols} />
      }
      return (
        <group position-z={512}>
          <PanelComponent
            width={rect.width}
            height={rect.height}
            color={14}
            bg={1}
            text={rect.text}
            ymargin={0}
            mediasource="board"
          />
        </group>
      )
    }
    case RECT_TYPE.FRAMED:
      return <ScreenUIFramed width={rect.width} height={rect.height} />
    default:
      return null
  }
}

export function ScreenUILayout() {
  const layout = useScreenUILayoutContext()
  const inputblocked = useGadgetInputBlocked()

  if (!layout) {
    return null
  }

  const { screensize, rects } = layout

  return (
    <>
      <group
        position={[
          -RUNTIME.DRAW_CHAR_WIDTH(),
          -RUNTIME.DRAW_CHAR_HEIGHT(),
          -524,
        ]}
      >
        <Rect
          visible
          color={SCREEN_BACKDROP_COLOR}
          width={screensize.cols + 2}
          height={screensize.rows + 2}
        />
      </group>
      <group position={[0, 0, -512]}>
        {rects.map((rect) => {
          return (
            <group
              key={rect.name}
              position={[
                rect.x * RUNTIME.DRAW_CHAR_WIDTH(),
                rect.y * RUNTIME.DRAW_CHAR_HEIGHT(),
                0,
              ]}
            >
              <LayoutRect rect={rect} />
            </group>
          )
        })}
        {inputblocked && (
          // Local 511 -> world -1 with this group at -512: in front of the board
          // (-512), behind the tape / sidebar (0) and scroll / editor (900+).
          <Rect
            blocking
            visible={false}
            width={screensize.cols}
            height={screensize.rows}
            z={511}
          />
        )}
      </group>
    </>
  )
}
