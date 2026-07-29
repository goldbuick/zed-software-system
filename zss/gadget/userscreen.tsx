/* eslint-disable react-refresh/only-export-components */
import { useThree } from '@react-three/fiber'
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useDeviceData, type TOUCHPADS } from 'zss/gadget/device'
import { TouchUI } from 'zss/screens/touchui/component'
import {
  ACTION_ROW_WIDTH,
  LANDSCAPE_TOUCH_RAIL_COLS,
  PORTRAIT_DOCK_STICK_TOP,
  PORTRAIT_SIDEBAR_OVERLAY_ROWS,
  PORTRAIT_TOUCH_DOCK_ROWS,
  TOUCH_SIDEBAR_COLS,
} from 'zss/screens/touchui/layout'
import { useShallow } from 'zustand/react/shallow'

// screensize in chars (game frame only when touch controls reserve space)
const Screensize = createContext({
  cols: 1,
  rows: 1,
  marginx: 1,
  marginy: 1,
  viewwidth: 1,
  viewheight: 1,
})

export function useScreenSize() {
  return useContext(Screensize)
}

function marginxfor(viewwidth: number, totalcols: number, cw: number) {
  return (viewwidth - totalcols * cw) * 0.5
}

function marginyfor(viewheight: number, totalrows: number, ch: number) {
  return (viewheight - totalrows * ch) * 0.5
}

type UserScreenProps = PropsWithChildren<any>

export function UserScreen({ children }: UserScreenProps) {
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()
  const {
    saferows,
    islandscape,
    showtouchcontrols,
    sidebaropen,
    textcapturefocused,
  } = useDeviceData(
    useShallow((state) => ({
      saferows: state.saferows,
      islandscape: state.islandscape,
      showtouchcontrols: state.showtouchcontrols,
      sidebaropen: state.sidebaropen,
      textcapturefocused: state.textcapturefocused,
    })),
  )
  const hassidebar = useGadgetClient(
    (state) => (state.gadget.sidebar?.length ?? 0) > 0,
  )

  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()

  const rcols = viewwidth / cw
  const rrows = viewheight / ch
  const totalcols = Math.floor(rcols)
  const totalrows = Math.floor(rrows)
  // Focus only: saferows < totalrows is often true from Safari chrome alone.
  const keyboardopen = textcapturefocused

  let cols = totalcols
  let rows = totalrows
  let insetx = 0
  const insety = 0
  let leftrailcols = 0
  let rightrailcols = 0
  let dockcols = 0
  let dockrows = 0
  let rightrailx = 0
  let docky = 0
  let actionx = 0
  let siderows = 0
  let gamerows = totalrows

  if (showtouchcontrols) {
    if (islandscape) {
      // Rails stay up while typing; canvas stays full height (keyboard overlays).
      const sidecols = hassidebar ? TOUCH_SIDEBAR_COLS : 0
      leftrailcols = LANDSCAPE_TOUCH_RAIL_COLS
      rightrailcols = LANDSCAPE_TOUCH_RAIL_COLS
      cols = totalcols - leftrailcols - rightrailcols - sidecols
      insetx = leftrailcols * cw
      rightrailx = (leftrailcols + cols) * cw
      actionx = leftrailcols * cw
      rows = totalrows
    } else {
      dockcols = totalcols
      siderows = sidebaropen && hassidebar ? PORTRAIT_SIDEBAR_OVERLAY_ROWS : 0
      // One row above the dock for the sidebar label; keep terminal out of it.
      const togglerows = hassidebar && !keyboardopen ? 1 : 0
      if (keyboardopen) {
        // Full saferows for game; dock unmounted while typing.
        dockrows = 0
        gamerows = Math.max(10, saferows - siderows)
        docky = 0
      } else {
        dockrows = PORTRAIT_TOUCH_DOCK_ROWS
        gamerows = totalrows - dockrows - siderows - togglerows
        docky = (gamerows + siderows + togglerows) * ch
      }
      rows = gamerows
    }
  }

  const marginx = marginxfor(viewwidth, totalcols, cw)
  const marginy = marginyfor(viewheight, totalrows, ch)

  const touchpads = useMemo((): TOUCHPADS | null => {
    // Portrait typing: hide pads with the dock. Landscape keeps rail pads.
    if (!showtouchcontrols || (keyboardopen && !islandscape)) {
      return null
    }
    if (islandscape) {
      return {
        move: {
          left: marginx,
          top: marginy,
          width: leftrailcols * cw,
          height: totalrows * ch,
        },
        shoot: {
          left: marginx + rightrailx,
          top: marginy,
          width: rightrailcols * cw,
          height: totalrows * ch,
        },
      }
    }
    const sticktop = PORTRAIT_DOCK_STICK_TOP
    const stickrows = dockrows - sticktop
    const mid = Math.floor(dockcols * 0.5)
    const sticktoppx = marginy + docky + sticktop * ch
    return {
      move: {
        left: marginx,
        top: sticktoppx,
        width: mid * cw,
        height: stickrows * ch,
      },
      shoot: {
        left: marginx + mid * cw,
        top: sticktoppx,
        width: (dockcols - mid) * cw,
        height: stickrows * ch,
      },
    }
  }, [
    showtouchcontrols,
    keyboardopen,
    islandscape,
    marginx,
    marginy,
    leftrailcols,
    rightrailcols,
    rightrailx,
    cw,
    ch,
    totalrows,
    dockcols,
    dockrows,
    docky,
  ])

  useEffect(() => {
    useDeviceData.setState((state) => ({
      ...state,
      insetcols: dockcols || leftrailcols || 1,
      insetrows: dockrows || totalrows || 1,
      touchpads,
    }))
  }, [dockcols, dockrows, leftrailcols, totalrows, touchpads])

  const screensize = useMemo(
    () => ({ cols, rows, marginx, marginy, viewwidth, viewheight }),
    [cols, rows, marginx, marginy, viewwidth, viewheight],
  )

  return (
    <Screensize.Provider value={screensize}>
      {cols >= 10 && rows >= 10 && (
        <group scale-x={-1} rotation-z={Math.PI}>
          <group
            position={[
              viewwidth * -0.5 + marginx,
              viewheight * -0.5 + marginy,
              0,
            ]}
          >
            <group position={[insetx, insety, 0]}>{children}</group>
            {showtouchcontrols && islandscape && (
              <>
                <group position={[0, 0, 3]}>
                  <TouchUI
                    key={`left-${leftrailcols}-${totalrows}`}
                    mode="landscape-rail-left"
                    width={leftrailcols}
                    height={totalrows}
                  />
                </group>
                <group position={[rightrailx, 0, 3]}>
                  <TouchUI
                    key={`right-${rightrailcols}-${totalrows}`}
                    mode="landscape-rail-right"
                    width={rightrailcols}
                    height={totalrows}
                  />
                </group>
                <group position={[actionx, 0, 4]}>
                  <TouchUI
                    key={`actions-${cols}`}
                    mode="landscape-actions"
                    width={Math.max(ACTION_ROW_WIDTH, cols)}
                    height={3}
                  />
                </group>
              </>
            )}
            {showtouchcontrols && !islandscape && !keyboardopen && (
              <>
                {hassidebar && (
                  <group position={[0, docky - ch, 4]}>
                    <TouchUI
                      key={`sidebartoggle-${dockcols}`}
                      mode="portrait-sidebartoggle"
                      width={dockcols}
                      height={1}
                    />
                  </group>
                )}
                <group position={[0, docky, 3]}>
                  <TouchUI
                    key={`dock-${dockcols}-${dockrows}-${docky}`}
                    mode="portrait-dock"
                    width={dockcols}
                    height={dockrows}
                  />
                </group>
              </>
            )}
          </group>
        </group>
      )}
    </Screensize.Provider>
  )
}
