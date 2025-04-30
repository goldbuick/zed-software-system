import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { useRef } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import Clipping from '../clipping'

import { FlatLayer } from './flatlayer'
import { Mode7Layer } from './mode7layer'
import { RenderLayer } from './renderlayer'

type FramedProps = {
  width: number
  height: number
}

export function Mode7Graphics({ width, height }: FramedProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const focusref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)

  useFrame((_, delta) => {
    if (
      !overref.current ||
      !underref.current ||
      !focusref.current ||
      !cameraref.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // viewsize
    const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
    const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

    // drawsize
    const drawwidth = BOARD_WIDTH * RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = BOARD_HEIGHT * RUNTIME.DRAW_CHAR_HEIGHT()

    // framing
    const cx = viewwidth * 0.5 - drawwidth * 0.5
    const cy = viewheight * 0.5 - drawheight * 0.5

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      switch (control.viewscale) {
        case 3:
          cameraref.current.position.z = 128
          break
        case 1.5:
          cameraref.current.position.z = 256
          break
        case 1:
          cameraref.current.position.z = 1024
          break
      }

      // zoomref.current.scale.setScalar(control.viewscale)
      cameraref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        facing: control.facing,
        viewscale: control.viewscale,
      }
    }

    overref.current.position.x = cx
    overref.current.position.y = cy
    underref.current.position.x = cx
    underref.current.position.y = cy

    // zoom
    //

    // focus
    focusref.current.position.x =
      (control.focusx + 0.5) * -RUNTIME.DRAW_CHAR_WIDTH()
    focusref.current.position.y = control.focusy * -RUNTIME.DRAW_CHAR_HEIGHT()
  })

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  const {
    over = [],
    under = [],
    layers = [],
  } = useGadgetClient.getState().gadget

  const layersindex = under.length * 2 + 2
  const overindex = layersindex + 2

  // handle graphics modes
  const control = layersreadcontrol(layers)
  const drawwidth = BOARD_WIDTH * RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = BOARD_HEIGHT * RUNTIME.DRAW_CHAR_HEIGHT()

  return (
    <Clipping width={viewwidth} height={viewheight}>
      <group ref={underref} scale={[2, 2, 2]}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
      <RenderLayer viewwidth={viewwidth} viewheight={viewheight}>
        <PerspectiveCamera
          ref={cameraref}
          makeDefault
          near={1}
          far={2000}
          position={[0, 0, 0]}
        />
        <group rotation={[Math.PI * 0.37, 0, 0]}>
          <group ref={focusref}>
            {layers.map((layer, i) => (
              <Mode7Layer key={layer.id} id={layer.id} from="layers" z={0} />
            ))}
          </group>
        </group>
      </RenderLayer>
      <group ref={overref} position-z={overindex}>
        {over.map((layer, i) => (
          <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
        ))}
      </group>
    </Clipping>
  )
}
