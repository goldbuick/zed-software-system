import {
  Profiler,
  type ProfilerOnRenderCallback,
  useEffect,
  useState,
} from 'react'
import { registerterminalopen } from 'zss/device/api'
import { finisheditorclose } from 'zss/device/register/handlers/editor'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  tapelayoutslotforeditor,
  tapelayoutslotforterminal,
} from 'zss/feature/tapelayout'
import {
  TAPE_DISPLAY,
  TERMINAL_MODE,
  useGadgetClient,
  useTape,
} from 'zss/gadget/data/zustandstores'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { PerfMonitorTiles } from 'zss/perf/perfmonitortiles'
import { PanelSlide } from 'zss/screens/scroll/panelslide'
import { useShallow } from 'zustand/react/shallow'

import { TapeLayout } from './layout'

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

function useTapePanelSlide(wantopen: boolean, livegeom: HeldTapeGeom) {
  const [panelactive, setpanelactive] = useState(false)
  const [shouldclose, setshouldclose] = useState(false)
  const [held, setheld] = useState<HeldTapeGeom | null>(null)

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

  return {
    panelactive,
    shouldclose,
    geom: held ?? livegeom,
    onclosed() {
      setpanelactive(false)
      setshouldclose(false)
      setheld(null)
    },
  }
}

type TapeSlidePanelProps = {
  slide: ReturnType<typeof useTapePanelSlide>
  showeditor: boolean
  focused: boolean
  marginx: number
  marginy: number
  z: number
  onclosed?: () => void
}

function TapeSlidePanel({
  slide,
  showeditor,
  focused,
  marginx,
  marginy,
  z,
  onclosed,
}: TapeSlidePanelProps) {
  if (!slide.panelactive) {
    return null
  }
  const { geom, shouldclose } = slide
  const frombottom = geom.layout === TAPE_DISPLAY.BOTTOM
  const body = (
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
      <TapeLayout
        terminalmode={geom.terminalmode}
        top={geom.top}
        width={geom.cols}
        height={geom.height}
        showeditor={showeditor}
      />
    </>
  )
  return (
    <group position={[Math.round(marginx), Math.round(marginy * 0.25), z]}>
      <PanelSlide
        shouldclose={shouldclose}
        frombottom={frombottom}
        onclosed={() => {
          slide.onclosed()
          onclosed?.()
        }}
      >
        {focused ? <UserFocus blockhotkeys>{body}</UserFocus> : body}
      </PanelSlide>
    </group>
  )
}

export function TapeComponent() {
  const screensize = useScreenSize()
  const [layoutby, terminalmode, terminalopen, editoropen, editorclosing] =
    useTape(
      useShallow((state) => [
        state.layoutby,
        state.terminalmode,
        state.terminal.open,
        state.editor.open,
        state.editor.closing,
      ]),
    )
  const hasboard = useGadgetClient(
    (state) => (state.gadget.layers?.length ?? 0) > 0,
  )

  // Terminal and editor each own a PanelSlide with separate layoutby geoms.
  // Hide the CLI while the editor is open (including exit slide) so it does
  // not peek under the editor; it restores after finisheditorclose.
  const wantterminal =
    (terminalmode === 'quick' || terminalopen) && !editoropen
  const wanteditor = editoropen && !editorclosing

  const terminallayout = hasboard
    ? tapelayoutslotforterminal(layoutby, terminalmode)
    : TAPE_DISPLAY.FULL
  const editorlayout = hasboard
    ? tapelayoutslotforeditor(layoutby)
    : TAPE_DISPLAY.FULL

  const terminallivegeom = readtapegeom(
    terminallayout,
    screensize.cols,
    screensize.rows,
    terminalmode,
  )
  const editorlivegeom = readtapegeom(
    editorlayout,
    screensize.cols,
    screensize.rows,
    terminalmode,
  )

  const terminalslide = useTapePanelSlide(wantterminal, terminallivegeom)
  const editorslide = useTapePanelSlide(wanteditor, editorlivegeom)

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const player = registerreadplayer()
  const anypanel = terminalslide.panelactive || editorslide.panelactive
  const showhotkeys = !anypanel
  // Keep focus on the topmost open panel; never focus while that panel is exiting.
  const editorfocused = editorslide.panelactive && !editorslide.shouldclose
  const terminalfocused =
    !editorslide.panelactive &&
    terminalslide.panelactive &&
    !terminalslide.shouldclose

  const body = (
    <>
      <PerfMonitorTiles />
      <TapeSlidePanel
        slide={terminalslide}
        showeditor={false}
        focused={terminalfocused}
        marginx={screensize.marginx}
        marginy={screensize.marginy}
        z={0}
      />
      <TapeSlidePanel
        slide={editorslide}
        showeditor
        focused={editorfocused}
        marginx={screensize.marginx}
        marginy={screensize.marginy}
        z={1}
        onclosed={() => {
          if (useTape.getState().editor.closing) {
            finisheditorclose(SOFTWARE, player)
          }
        }}
      />
      {showhotkeys ? (
        <>
          <UserHotkey hotkey="Shift+?" althotkey="/">
            {() => registerterminalopen(SOFTWARE, player)}
          </UserHotkey>
          <UserHotkey hotkey="`">
            {() => registerterminalopen(SOFTWARE, player)}
          </UserHotkey>
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
