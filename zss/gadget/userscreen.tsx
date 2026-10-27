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
import { type TOUCHPADS, useDeviceData } from 'zss/gadget/device'
import { useGadgetInputBlocked } from 'zss/screens/screenui/gadgetinputblocked'
import { TouchUI } from 'zss/screens/touchui/component'
import {
  PORTRAIT_DOCK_STICK_TOP,
  readtouchscreenlayout,
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
  const inputblocked = useGadgetInputBlocked()
  const { saferows, showtouchcontrols, sidebaropen, textcapturefocused } =
    useDeviceData(
      useShallow((state) => ({
        saferows: state.saferows,
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

  const cols = totalcols
  const { rows, dockcols, dockrows, dockrow } = readtouchscreenlayout({
    totalcols,
    totalrows,
    saferows,
    showtouchcontrols,
    hassidebar,
    sidebaropen,
    keyboardopen,
  })
  const docky = dockrow * ch

  const marginx = marginxfor(viewwidth, totalcols, cw)
  const marginy = marginyfor(viewheight, totalrows, ch)

  const touchpads = useMemo((): TOUCHPADS | null => {
    // Typing: hide pads with the dock.
    if (!showtouchcontrols || keyboardopen) {
      return null
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
    marginx,
    marginy,
    cw,
    ch,
    dockcols,
    dockrows,
    docky,
  ])

  useEffect(() => {
    useDeviceData.setState((state) => ({
      ...state,
      insetcols: dockcols || 1,
      insetrows: dockrows || totalrows || 1,
      touchpads,
    }))
  }, [dockcols, dockrows, totalrows, touchpads])

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
            {children}
            {showtouchcontrols && !inputblocked && !keyboardopen && (
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
