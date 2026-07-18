/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { PanelSlide } from 'zss/screens/scroll/panelslide'
import { TapeLayoutTiles } from 'zss/screens/tape/layouttiles'
import { WanixTermScreen } from 'zss/screens/wanix/termscreen'
import { WanixTermSizeSync } from 'zss/screens/wanix/termsizesync'

/** True while attach panel is mounted for slide in/out (incl. after store close). */
let attachslideactive = false

export function readwanixattachslideactive() {
  return attachslideactive
}

type HeldAttachGeom = {
  top: number
  height: number
  cols: number
  layout: TAPE_DISPLAY
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

  const wantopen = attachpanelopen && attachedsessionkey != null && !editoropen

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
    // livegeom is a new object each render; track primitive fields instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livegeom fields listed
  }, [
    wantopen,
    attachedsessionkey,
    livegeom.top,
    livegeom.height,
    livegeom.cols,
    livegeom.layout,
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
        <PanelSlide
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
          {shouldclose ? tiles : <UserFocus blockhotkeys>{tiles}</UserFocus>}
        </PanelSlide>
      </group>
    </>
  )
}
