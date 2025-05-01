import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { damp, damp3, dampE } from 'maath/easing'
import { useRef } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol, VIEWSCALE } from 'zss/gadget/data/types'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import Clipping from '../clipping'

import { FlatLayer } from './flatlayer'
import { Mode7Layer } from './mode7layer'
import { RenderLayer } from './renderlayer'

type FramedProps = {
  width: number
  height: number
}

function mapviewtoz(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 128
    default:
    case VIEWSCALE.MID:
      return 256
    case VIEWSCALE.FAR:
      return 550
  }
}

function mapviewtopadd(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 0
    default:
    case VIEWSCALE.MID:
      return 1
    case VIEWSCALE.FAR:
      return -1
  }
}

function mapviewtotilt(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 0.777
    default:
    case VIEWSCALE.MID:
      return 1.11
    case VIEWSCALE.FAR:
      return 0.666
  }
}

export function Mode7Graphics({ width, height }: FramedProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const tiltref = useRef<Group>(null)
  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const focusref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)

  useFrame((_, delta) => {
    if (
      !tiltref.current ||
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
    if (!ispresent(focusref.current.userData.focusx)) {
      focusref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        facing: control.facing,
        focusz: mapviewtoz(control.viewscale),
      }
    }

    overref.current.position.x = cx
    overref.current.position.y = cy
    underref.current.position.x = cx
    underref.current.position.y = cy

    const animrate = 0.125
    const padding = mapviewtopadd(control.viewscale)
    const focusx = focusref.current.userData.focusx
    const focusy = focusref.current.userData.focusy
    const fx = (focusx - 0.5) * -RUNTIME.DRAW_CHAR_WIDTH()
    const fy = (focusy + padding) * -RUNTIME.DRAW_CHAR_HEIGHT()

    // zoom
    damp3(
      cameraref.current.position,
      [0, 0, mapviewtoz(control.viewscale)],
      animrate,
      delta,
    )

    // tilt
    dampE(
      tiltref.current.rotation,
      [mapviewtotilt(control.viewscale), 0, 0],
      animrate,
      delta,
    )

    // focus
    damp3(focusref.current.position, [fx, fy, 0], animrate, delta)

    // smoothed change in focus
    damp(focusref.current.userData, 'focusx', control.focusx, animrate)
    damp(focusref.current.userData, 'focusy', control.focusy, animrate)
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

  console.info(deepcopy(layers))

  return (
    <Clipping width={viewwidth} height={viewheight}>
      <group ref={underref} scale={[1.5, 1.5, 1.5]}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
      <group position-z={layersindex}>
        <RenderLayer viewwidth={viewwidth} viewheight={viewheight}>
          <PerspectiveCamera ref={cameraref} makeDefault near={1} far={2000} />
          <group ref={tiltref}>
            <group ref={focusref}>
              {layers.map((layer) => (
                <Mode7Layer key={layer.id} id={layer.id} from="layers" z={0} />
              ))}
            </group>
          </group>
        </RenderLayer>
      </group>
      <group ref={overref} position-z={overindex} scale={[1.5, 1.5, 1.5]}>
        {over.map((layer, i) => (
          <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
        ))}
      </group>
    </Clipping>
  )
}

/*



*/
