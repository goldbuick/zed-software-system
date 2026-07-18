import {
  Profiler,
  type ProfilerOnRenderCallback,
  useEffect,
  useState,
} from 'react'
import { registerterminalopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import { reattachwanixterm } from 'zss/device/wanixclient/wanixdisplay'
import {
  TAPE_DISPLAY,
  TERMINAL_MODE,
  useTape,
} from 'zss/gadget/data/zustandstores'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { PerfMonitorTiles } from 'zss/perf/perfmonitortiles'
import { PanelSlide } from 'zss/screens/scroll/panelslide'
import {
  WanixAttachPanel,
  readwanixattachslideactive,
} from 'zss/screens/wanix/attachpanel'
import { useShallow } from 'zustand/react/shallow'

import { TapeLayout } from './layout'

/** is-hotkey cannot parse `\`; use a raw keydown for game-only re-attach. */
function WanixReattachHotkey() {
  useEffect(() => {
    function onkeydown(event: KeyboardEvent) {
      if (!event.ctrlKey || event.key !== '\\') {
        return
      }
      // Attach panel owns Ctrl+\ while open or sliding out.
      if (
        useWanixClient.getState().attachpanelopen ||
        readwanixattachslideactive()
      ) {
        return
      }
      event.preventDefault()
      reattachwanixterm()
    }
    document.addEventListener('keydown', onkeydown)
    return () => document.removeEventListener('keydown', onkeydown)
  }, [])
  return null
}

const tapeprofileronrender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
) => {
  if (!useTape.getState().perfmonitor) {
    return
  }
  // eslint-disable-next-line no-console -- intentional perf logging when perf monitor is on
  console.debug(`[zss perf] ${id} ${phase} ${actualDuration.toFixed(2)}ms`)
}

type HeldTapeGeom = {
  top: number
  height: number
  cols: number
  rows: number
  layout: TAPE_DISPLAY
  terminalmode: TERMINAL_MODE
}

function readtapegeom(
  layout: TAPE_DISPLAY,
  cols: number,
  rows: number,
  terminalmode: TERMINAL_MODE,
): HeldTapeGeom {
  let top = 0
  let height = rows
  switch (layout) {
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
  return { top, height, cols, rows, layout, terminalmode }
}

export function TapeComponent() {
  const screensize = useScreenSize()
  const [layout, terminalmode, terminalopen, editoropen] = useTape(
    useShallow((state) => [
      state.layout,
      state.terminalmode,
      state.terminal.open,
      state.editor.open,
    ]),
  )
  const attachpanelopen = useWanixClient((state) => state.attachpanelopen)
  const attachedsessionkey = useWanixClient((state) => state.attachedsessionkey)
  const showattach =
    attachpanelopen && attachedsessionkey != null && !editoropen

  const wantopen =
    !showattach && (terminalmode === 'quick' || terminalopen || editoropen)

  const [panelactive, setpanelactive] = useState(false)
  const [shouldclose, setshouldclose] = useState(false)
  const [held, setheld] = useState<HeldTapeGeom | null>(null)

  const livegeom = readtapegeom(
    layout,
    screensize.cols,
    screensize.rows,
    terminalmode,
  )

  useEffect(() => {
    if (wantopen) {
      setheld(livegeom)
      setpanelactive(true)
      setshouldclose(false)
      return
    }
    if (panelactive) {
      setshouldclose(true)
    }
    // livegeom is a new object each render; track primitive fields instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livegeom fields listed
  }, [
    wantopen,
    livegeom.top,
    livegeom.height,
    livegeom.cols,
    livegeom.rows,
    livegeom.layout,
    livegeom.terminalmode,
    panelactive,
  ])

  const geom = held ?? livegeom
  const frombottom = geom.layout === TAPE_DISPLAY.BOTTOM

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const player = registerreadplayer()
  const showhotkeys = !showattach && !panelactive

  const tapebody = (
    <>
      <ShadeBoxDither
        width={geom.cols}
        height={geom.rows}
        top={geom.top}
        left={0}
        right={geom.cols - 1}
        bottom={geom.top + geom.height - 1}
        alpha={geom.terminalmode === 'quick' ? 0.666 : 0.333}
      />
      {shouldclose ? (
        <TapeLayout
          terminalmode={geom.terminalmode}
          top={geom.top}
          width={geom.cols}
          height={geom.height}
        />
      ) : (
        <UserFocus blockhotkeys>
          <TapeLayout
            terminalmode={geom.terminalmode}
            top={geom.top}
            width={geom.cols}
            height={geom.height}
          />
        </UserFocus>
      )}
    </>
  )

  const body = (
    <>
      <PerfMonitorTiles />
      <WanixAttachPanel />
      {panelactive ? (
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
              setpanelactive(false)
              setshouldclose(false)
              setheld(null)
            }}
          >
            {tapebody}
          </PanelSlide>
        </group>
      ) : showhotkeys ? (
        <>
          <UserHotkey hotkey="Shift+?" althotkey="/">
            {() => registerterminalopen(SOFTWARE, player)}
          </UserHotkey>
          <UserHotkey hotkey="`">
            {() => registerterminalopen(SOFTWARE, player)}
          </UserHotkey>
          {/* Only when attach is closed: same Ctrl+\ while attached was
              re-attaching immediately after termscreen detached. */}
          <WanixReattachHotkey />
        </>
      ) : null}
    </>
  )

  // Keep Profiler mounted in DEV even when perfmonitor is off — wrapping only
  // while on remounts body (incl. PerfMonitorTiles) and skips the exit slide.
  if (import.meta.env.DEV) {
    return (
      <Profiler id="TapeComponent" onRender={tapeprofileronrender}>
        {body}
      </Profiler>
    )
  }

  return body
}
