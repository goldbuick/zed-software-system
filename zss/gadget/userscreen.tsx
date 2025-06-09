/* eslint-disable react/no-unknown-property */
/* eslint-disable react-refresh/only-export-components */
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { createContext, PropsWithChildren, useContext, useEffect } from 'react'
import { RUNTIME } from 'zss/config'

import { useDeviceConfig } from './hooks'
import { TouchUI } from './touchui/component'

// screensize in chars
const Screensize = createContext({ cols: 1, rows: 1 })

export function useScreenSize() {
  return useContext(Screensize)
}

type UserScreenProps = PropsWithChildren<any>

export function UserScreen({ children }: UserScreenProps) {
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()
  const { islandscape, showtouchcontrols } = useDeviceConfig()

  // cols
  const rcols = viewwidth / RUNTIME.DRAW_CHAR_WIDTH()
  let cols = Math.floor(rcols)
  // rows
  const rrows = viewheight / RUNTIME.DRAW_CHAR_HEIGHT()
  let rows = Math.floor(rrows)
  // margins
  const marginx = (viewwidth - cols * RUNTIME.DRAW_CHAR_WIDTH()) * 0.5
  const marginy = (viewheight - rows * RUNTIME.DRAW_CHAR_HEIGHT()) * 0.5

  // touch ui
  let insetx = 0
  let insety = 0
  const insetcols = Math.round(rcols)
  let insetrows = Math.round(rrows)
  if (showtouchcontrols) {
    if (islandscape) {
      const inset = 5
      insetx = inset * RUNTIME.DRAW_CHAR_WIDTH()
      cols -= inset * 2
    } else {
      rows = Math.round(rows * 0.666)
      insetrows -= rows
      insety = rows * RUNTIME.DRAW_CHAR_HEIGHT()
    }
  }

  useEffect(() => {
    useDeviceConfig.setState((state) => ({
      ...state,
      insetcols,
      insetrows,
    }))
  }, [insetcols, insetrows])

  return (
    <Screensize.Provider value={{ cols, rows }}>
      <OrthographicCamera
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      {cols >= 10 && rows >= 10 && (
        <group scale-x={-1} rotation-z={Math.PI}>
          <group
            position={[
              viewwidth * -0.5 + marginx,
              viewheight * -0.5 + marginy,
              0,
            ]}
          >
            <group position={[insetx, 0, 0]}>{children}</group>
            {showtouchcontrols && (
              <group position={[0, insety, 0]}>
                <TouchUI
                  key={insetcols * insetrows}
                  width={insetcols}
                  height={insetrows}
                />
              </group>
            )}
          </group>
        </group>
      )}
    </Screensize.Provider>
  )
}
