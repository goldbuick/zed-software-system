import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, Plane, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { resettiles, useTiles } from 'zss/gadget/tiles'
import {
  fillmarqueebuffer,
  measuremarqueeline,
} from 'zss/screens/scroll/marqueebuffer'
import { createwritetextcontext } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { useTape } from './data/state'
import { ShadeBoxDither } from './graphics/dither'
import { useScreenSize } from './userscreen'
import { TilesData, TilesRender } from './usetiles'

type TapeToastProps = {
  toast: string
}

/** Subscribes to tape toast state so only this subtree re-renders on toast change. */
export function TapeToastConnected() {
  const toast = useTape((state) => state.toast)
  return <TapeToast toast={toast} />
}

const charwidth = () => RUNTIME.DRAW_CHAR_WIDTH()
const charheight = () => RUNTIME.DRAW_CHAR_HEIGHT()

export function TapeToast({ toast }: TapeToastProps) {
  const screensize = useScreenSize()
  const containerref = useRef<Group>(null)
  const slidingref = useRef<Group>(null)
  const planesref = useRef<[Plane, Plane]>([
    new Plane(new Vector3(1, 0, 0), 0),
    new Plane(new Vector3(-1, 0, 0), 0),
  ])
  const xaxisref = useRef(new Vector3())
  const negxaxisref = useRef(new Vector3())
  const leftpointref = useRef(new Vector3())
  const rightpointref = useRef(new Vector3())

  const line = toast ? `${toast}$32$19$32` : ''
  const { content, contentmax } = measuremarqueeline(line || ' ', COLOR.YELLOW)
  const widewidth = toast ? Math.max(1, contentmax) + screensize.cols : 1

  const widestore = useTiles(widewidth, 1, 0, COLOR.GREEN, COLOR.ONCLEAR)

  useEffect(() => {
    if (!toast) {
      return
    }
    const state = widestore.getState()
    resettiles(state, 0, COLOR.GREEN, COLOR.ONCLEAR)
    const context = {
      ...createwritetextcontext(
        widewidth,
        1,
        COLOR.GREEN,
        COLOR.ONCLEAR,
        0,
        0,
        widewidth - 1,
        1,
      ),
      ...state,
    }
    fillmarqueebuffer(context, content, contentmax, 0, 1, widewidth - 1, 0, 0)
  }, [toast, content, contentmax, widewidth, widestore])

  useFrame((_, delta) => {
    const sliding = slidingref.current
    const container = containerref.current
    if (!sliding || !toast) {
      return
    }
    const cw = charwidth()
    const step = delta * 5 * cw
    sliding.position.x -= step
    const wrapat = contentmax * cw
    if (sliding.position.x <= -wrapat) {
      sliding.position.x += wrapat
    }
    if (container && planesref.current) {
      container.getWorldPosition(leftpointref.current)
      xaxisref.current.set(
        container.matrixWorld.elements[0],
        container.matrixWorld.elements[1],
        container.matrixWorld.elements[2],
      )
      rightpointref.current
        .copy(leftpointref.current)
        .addScaledVector(xaxisref.current, screensize.cols * cw)
      planesref.current[0].setFromNormalAndCoplanarPoint(
        xaxisref.current,
        leftpointref.current,
      )
      negxaxisref.current.copy(xaxisref.current).negate()
      planesref.current[1].setFromNormalAndCoplanarPoint(
        negxaxisref.current,
        rightpointref.current,
      )
    }
  })

  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const rightedge = screensize.cols - 1
  return (
    <group ref={containerref} position={[0, 0, 999]}>
      {toast && (
        <>
          <group position-y={charheight() * -4}>
            <ShadeBoxDither
              alpha={0.777}
              width={screensize.cols}
              height={10}
              top={0}
              left={0}
              right={rightedge}
              bottom={0}
            />
          </group>
          <group ref={slidingref}>
            <TilesData store={widestore}>
              <TilesRender
                label="toast-marquee"
                width={widewidth}
                height={1}
                clippingplanes={planesref.current}
              />
            </TilesData>
          </group>
        </>
      )}
    </group>
  )
}
