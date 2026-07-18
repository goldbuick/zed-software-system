import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Group } from 'three'
import { registerterminalopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { ispresent } from 'zss/mapping/types'
import {
  animpositiontotarget,
  animsnapy,
} from 'zss/screens/scroll/anim'
import { TapeLayoutTiles } from 'zss/screens/tape/layouttiles'
import { WanixTermScreen } from 'zss/screens/wanix/termscreen'
import { WanixTermSizeSync } from 'zss/screens/wanix/termsizesync'

/** True while attach panel is mounted for slide in/out (incl. after store close). */
let attachslideactive = false

export function readwanixattachslideactive() {
  return attachslideactive
}

const SLIDE_CLOSE_FAILSAFE_MS = 2000

type HeldAttachGeom = {
  top: number
  height: number
  cols: number
  layout: TAPE_DISPLAY
}

type WanixAttachSlideProps = {
  shouldclose: boolean
  /** BOTTOM enters/exits from below; TOP/FULL from above. */
  frombottom: boolean
  onclosed: () => void
  children: ReactNode
}

function readoffscreeny(viewportheight: number, frombottom: boolean) {
  // Match animpositiontotarget snap so completion can reach < 0.1.
  return animsnapy(frombottom ? viewportheight : -viewportheight)
}

/** Layout-aware slide: top/full from top, bottom from bottom. */
function WanixAttachSlide({
  shouldclose,
  frombottom,
  onclosed,
  children,
}: WanixAttachSlideProps) {
  const { viewport } = useThree()
  const groupref = useRef<Group>(null)
  const closedref = useRef(false)
  const wasclosedref = useRef(true)
  const edgeyref = useRef(0)
  const onclosedref = useRef(onclosed)
  onclosedref.current = onclosed
  const offy = readoffscreeny(viewport.height, frombottom)

  function finishclose() {
    if (closedref.current) {
      return
    }
    closedref.current = true
    onclosedref.current()
  }

  // Seed off-screen only when opening (not when layout/edge changes mid-open).
  useEffect(() => {
    if (shouldclose) {
      wasclosedref.current = true
      closedref.current = false
      // Exit along the edge for the layout at close time.
      edgeyref.current = offy
      return
    }
    if (wasclosedref.current && groupref.current) {
      wasclosedref.current = false
      edgeyref.current = offy
      groupref.current.position.y = offy
      groupref.current.userData.y = offy
      groupref.current.userData.vy = 0
    }
  }, [shouldclose, offy])

  // If damp never settles (or tab is backgrounded), do not leave UserFocus stuck.
  useEffect(() => {
    if (!shouldclose) {
      return
    }
    const timer = setTimeout(finishclose, SLIDE_CLOSE_FAILSAFE_MS)
    return () => clearTimeout(timer)
  }, [shouldclose])

  useFrame((_, delta) => {
    if (!ispresent(groupref.current)) {
      return
    }
    // Close uses the edge captured at open so direction stays stable.
    const target = shouldclose ? edgeyref.current : 0
    if (animpositiontotarget(groupref.current, 'y', target, delta)) {
      if (shouldclose) {
        finishclose()
      }
    }
  })

  return (
    <group ref={groupref} position-y={offy}>
      {children}
    </group>
  )
}

function readattachgeom(
  attachlayout: TAPE_DISPLAY,
  cols: number,
  rows: number,
): HeldAttachGeom {
  let top = 0
  let height = rows
  switch (attachlayout) {
    case TAPE_DISPLAY.TOP:
      height = Math.floor(rows * 0.5)
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.ceil(rows * 0.5)
      top = rows - height
      break
    default:
    case TAPE_DISPLAY.FULL:
      break
  }
  return { top, height, cols, layout: attachlayout }
}

/**
 * Independent guest attach overlay. Uses attachlayout (not useTape.layout)
 * and is mutually exclusive with the tape CLI chrome.
 */
export function WanixAttachPanel() {
  const screensize = useScreenSize()
  const attachpanelopen = useWanixClient((state) => state.attachpanelopen)
  const attachlayout = useWanixClient((state) => state.attachlayout)
  const attachedsessionkey = useWanixClient((state) => state.attachedsessionkey)
  const terminalmode = useTape((state) => state.terminalmode)
  const editoropen = useTape((state) => state.editor.open)

  const wantopen =
    attachpanelopen && attachedsessionkey != null && !editoropen

  const [panelactive, setpanelactive] = useState(false)
  const [shouldclose, setshouldclose] = useState(false)
  const [held, setheld] = useState<HeldAttachGeom | null>(null)
  const [heldsessionkey, setheldsessionkey] = useState<string | null>(null)

  const livegeom = readattachgeom(
    attachlayout,
    screensize.cols,
    screensize.rows,
  )

  useEffect(() => {
    if (wantopen) {
      setheld(livegeom)
      setheldsessionkey(attachedsessionkey)
      setpanelactive(true)
      setshouldclose(false)
      attachslideactive = true
      return
    }
    if (panelactive) {
      setshouldclose(true)
    }
  }, [
    wantopen,
    attachedsessionkey,
    livegeom.top,
    livegeom.height,
    livegeom.cols,
    panelactive,
  ])

  useEffect(() => {
    return () => {
      attachslideactive = false
    }
  }, [])

  const geom = held ?? livegeom
  const frombottom = geom.layout === TAPE_DISPLAY.BOTTOM

  if (!panelactive || screensize.cols < 10 || screensize.rows < 10) {
    return <WanixTermSizeSync />
  }

  const tiles = (
    <TapeLayoutTiles
      label="wanixattach"
      terminalmode={terminalmode}
      top={geom.top}
      left={0}
      width={geom.cols}
      height={geom.height}
    >
      <WanixTermScreen
        inputenabled={!shouldclose}
        displaysessionkey={shouldclose ? heldsessionkey : null}
      />
    </TapeLayoutTiles>
  )

  return (
    <>
      {!shouldclose && (
        <WanixTermSizeSync height={geom.height} width={geom.cols} />
      )}
      <group
        position={[
          Math.round(screensize.marginx),
          Math.round(screensize.marginy * 0.25),
          0,
        ]}
      >
        <WanixAttachSlide
          shouldclose={shouldclose}
          frombottom={frombottom}
          onclosed={() => {
            attachslideactive = false
            setpanelactive(false)
            setshouldclose(false)
            setheld(null)
            setheldsessionkey(null)
          }}
        >
          <ShadeBoxDither
            width={geom.cols}
            height={screensize.rows}
            top={geom.top}
            left={0}
            right={geom.cols - 1}
            bottom={geom.top + geom.height - 1}
            alpha={0.333}
          />
          {shouldclose ? (
            tiles
          ) : (
            <UserFocus blockhotkeys>
              <UserHotkey hotkey="`">
                {() => registerterminalopen(SOFTWARE, registerreadplayer())}
              </UserHotkey>
              <UserHotkey hotkey="Shift+?" althotkey="/">
                {() => registerterminalopen(SOFTWARE, registerreadplayer())}
              </UserHotkey>
              {tiles}
            </UserFocus>
          )}
        </WanixAttachSlide>
      </group>
    </>
  )
}
