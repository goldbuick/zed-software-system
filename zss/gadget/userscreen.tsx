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

  const rcols = viewwidth / RUNTIME.DRAW_CHAR_WIDTH()
  const rrows = viewheight / RUNTIME.DRAW_CHAR_HEIGHT()
  const cols = islowrez ? Math.ceil(rcols) : Math.floor(rcols)
  const rows = islowrez ? Math.ceil(rrows) : Math.floor(rrows)
  const marginx = (viewwidth - cols * RUNTIME.DRAW_CHAR_WIDTH()) * 0.5
  const marginy = (viewheight - rows * RUNTIME.DRAW_CHAR_HEIGHT()) * 0.5
  const withmarginx = islowrez ? 0 : marginx
  const withmarginy = islowrez ? 0 : marginy

  useLayoutEffect(() => {
    const oldCam = camera
    camera.updateProjectionMatrix()
    set(() => ({ camera: cameraRef.current! }))
    return () => set(() => ({ camera: oldCam }))
  }, [set, camera, cameraRef])

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
      <group scale-x={-1} rotation-z={Math.PI}>
        <group
          position={[
            viewwidth * -0.5 + withmarginx,
            viewheight * -0.5 + withmarginy,
            0,
          ]}
        >
          {children}
        </group>
      </group>
    </Screensize.Provider>
  )
}
