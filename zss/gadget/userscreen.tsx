/* eslint-disable react/no-unknown-property */
/* eslint-disable react-refresh/only-export-components */
import { useThree } from '@react-three/fiber'
import {
  createContext,
  PropsWithChildren,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react'
import { OrthographicCamera } from 'three'
import { RUNTIME } from 'zss/config'

import { TouchUI } from './touchui/component'

// screensize in chars
const Screensize = createContext({ cols: 1, rows: 1 })

export function useScreenSize() {
  return useContext(Screensize)
}

type UserScreenProps = PropsWithChildren<{
  islowrez: boolean
  islandscape: boolean
  showtouchcontrols: boolean
}>

export function UserScreen({
  islowrez,
  islandscape,
  showtouchcontrols,
  children,
}: UserScreenProps) {
  const { viewport, set, size, camera } = useThree()
  const cameraRef = useRef<OrthographicCamera>(null)
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()

  useLayoutEffect(() => {
    const oldCam = camera
    camera.updateProjectionMatrix()
    set(() => ({ camera: cameraRef.current! }))
    return () => set(() => ({ camera: oldCam }))
  }, [set, camera, cameraRef])

  // cols
  const rcols = viewwidth / RUNTIME.DRAW_CHAR_WIDTH()
  let cols = Math.floor(rcols)
  // rows
  const rrows = viewheight / RUNTIME.DRAW_CHAR_HEIGHT()
  let rows = Math.floor(rrows)
  // margins
  const marginx = (viewwidth - cols * RUNTIME.DRAW_CHAR_WIDTH()) * 0.5
  const marginy = (viewheight - rows * RUNTIME.DRAW_CHAR_HEIGHT()) * 0.5

  showtouchcontrols = true

  let insetx = 0
  let insety = 0
  let insetrows = Math.round(rrows)
  if (showtouchcontrols) {
    if (islandscape) {
      const inset = 5
      insetx = inset * RUNTIME.DRAW_CHAR_WIDTH()
      cols -= inset * 2
    } else {
      // withmarginy = 0
      rows = Math.round(rows * 0.75)
      // adjust overlap
      const overlap = rows - 1
      insetrows -= overlap
      insety = overlap * RUNTIME.DRAW_CHAR_HEIGHT()
    }
  }

  return (
    <Screensize.Provider value={{ cols, rows }}>
      <orthographicCamera
        ref={cameraRef}
        left={size.width / -2}
        right={size.width / 2}
        top={size.height / 2}
        bottom={size.height / -2}
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
                <TouchUI width={Math.round(rcols)} height={insetrows} />
              </group>
            )}
          </group>
        </group>
      )}
    </Screensize.Provider>
  )
}
