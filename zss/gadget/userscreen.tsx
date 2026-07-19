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
import { useDeviceData } from 'zss/gadget/device'
import { TouchUI } from 'zss/screens/touchui/component'
import {
  ACTION_ROW_WIDTH,
  LANDSCAPE_TOUCH_RAIL_COLS,
  PORTRAIT_DOCK_STICK_TOP,
  PORTRAIT_SIDEBAR_OVERLAY_ROWS,
  PORTRAIT_TOUCH_DOCK_ROWS,
  TOUCH_SIDEBAR_COLS,
} from 'zss/screens/touchui/layout'
import { StickOverlay } from 'zss/screens/touchui/stickoverlay'
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

type UserScreenProps = PropsWithChildren<any>

export function UserScreen({ children }: UserScreenProps) {
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()
  const { saferows, islandscape, showtouchcontrols, sidebaropen } =
    useDeviceData(
      useShallow((state) => ({
        saferows: state.saferows,
        islandscape: state.islandscape,
        showtouchcontrols: state.showtouchcontrols,
        sidebaropen: state.sidebaropen,
      })),
    )

  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()

  const rcols = viewwidth / cw
  const rrows = viewheight / ch
  const totalcols = Math.floor(rcols)
  const totalrows = Math.floor(rrows)

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
  let stickcols = 0
  let stickrows = 0
  let sticktop = 0
  let actionx = 0
  let siderows = 0

  if (showtouchcontrols) {
    if (islandscape) {
      leftrailcols = LANDSCAPE_TOUCH_RAIL_COLS
      rightrailcols = LANDSCAPE_TOUCH_RAIL_COLS
      const sidecols = TOUCH_SIDEBAR_COLS
      cols = totalcols - leftrailcols - rightrailcols - sidecols
      insetx = leftrailcols * cw
      rightrailx = (leftrailcols + cols) * cw
      stickcols = leftrailcols + cols + rightrailcols
      stickrows = totalrows
      sticktop = 0
      actionx = leftrailcols * cw
    } else {
      dockrows = PORTRAIT_TOUCH_DOCK_ROWS
      dockcols = totalcols
      siderows = sidebaropen ? PORTRAIT_SIDEBAR_OVERLAY_ROWS : 0
      let gamerows = totalrows - dockrows - siderows
      if (saferows >= 10 && saferows < gamerows + dockrows + siderows) {
        gamerows = Math.max(10, saferows - dockrows - siderows)
      }
      rows = gamerows
      docky = (gamerows + siderows) * ch
      stickcols = dockcols
      stickrows = dockrows
      sticktop = PORTRAIT_DOCK_STICK_TOP
    }
  }

  const marginx = (viewwidth - totalcols * cw) * 0.5
  const marginy = (viewheight - totalrows * ch) * 0.5

  useEffect(() => {
    useDeviceData.setState((state) => ({
      ...state,
      insetcols: dockcols || leftrailcols || 1,
      insetrows: dockrows || totalrows || 1,
    }))
  }, [dockcols, dockrows, leftrailcols, totalrows])

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
                <group position={[0, 0, 2]}>
                  <StickOverlay
                    key={`stick-land-${stickcols}-${stickrows}`}
                    width={stickcols}
                    height={stickrows}
                    sticktop={sticktop}
                  />
                </group>
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
            {showtouchcontrols && !islandscape && (
              <>
                <group position={[0, docky, 2]}>
                  <StickOverlay
                    key={`stick-port-${stickcols}-${stickrows}`}
                    width={stickcols}
                    height={stickrows}
                    sticktop={sticktop}
                  />
                </group>
                <group position={[0, docky, 3]}>
                  <TouchUI
                    key={`dock-${dockcols}-${dockrows}`}
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
