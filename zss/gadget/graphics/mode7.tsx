import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { damp, damp3, dampE } from 'maath/easing'
import { useRef } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE, layersreadcontrol, VIEWSCALE } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { FlatLayer } from './flatlayer'
import { MediaLayer } from './medialayer'
import { Mode7Layer } from './mode7layer'
import { RenderLayer } from './renderlayer'

type FramedProps = {
  width: number
  height: number
}

function mapviewtoz(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 128 + 32
    default:
    case VIEWSCALE.MID:
      return 256 + 64
    case VIEWSCALE.FAR:
      return 512 + 256
  }
}

function mapviewtotilt(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 0.888
    default:
    case VIEWSCALE.MID:
      return 0.777
    case VIEWSCALE.FAR:
      return 0.444
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

    // setup tracking state
    if (!ispresent(focusref.current.userData.focusx)) {
      focusref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        focuslx: control.focusx,
        focusly: control.focusy,
        focusvx: 0,
        focusvy: 0,
        facing: control.facing,
        focusz: mapviewtoz(control.viewscale),
      }
    }

    // framing
    overref.current.position.x = 0
    overref.current.position.y = viewheight - drawheight

    const rscale = clamp(viewwidth / drawwidth, 1.0, 10.0)
    underref.current.position.x = viewwidth - drawwidth * rscale
    underref.current.position.y = 0
    underref.current.scale.setScalar(rscale)

    const animrate = 0.125
    const focusx = focusref.current.userData.focusx
    const focusy = focusref.current.userData.focusy
    const focuslx = focusref.current.userData.focuslx
    const focusly = focusref.current.userData.focusly
    // bump focus by velocity
    const deltax = focusx - focuslx
    const deltay = focusy - focusly
    // inc velocity
    const pivotrate = 4.666
    focusref.current.userData.focusvx += deltax * pivotrate
    focusref.current.userData.focusvy += deltay * pivotrate
    // calc focus
    const fx =
      Math.round(focusx + focusref.current.userData.focusvx + 1) *
      -RUNTIME.DRAW_CHAR_WIDTH()
    const fy =
      Math.round(focusy + focusref.current.userData.focusvy + 1) *
      -RUNTIME.DRAW_CHAR_HEIGHT()
    // damp velocity
    const damprate = 8
    focusref.current.userData.focusvx -=
      focusref.current.userData.focusvx * delta * damprate
    focusref.current.userData.focusvy -=
      focusref.current.userData.focusvy * delta * damprate
    // update tracking
    focusref.current.userData.focuslx = focusref.current.userData.focusx
    focusref.current.userData.focusly = focusref.current.userData.focusy

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
    damp3(focusref.current.position, [fx, fy, 0], animrate * 2, delta)

    // smoothed change in focus
    damp(focusref.current.userData, 'focusx', control.focusx, animrate)
    damp(focusref.current.userData, 'focusy', control.focusy, animrate)

    // facing
    tiltref.current.rotation.z = control.facing
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
  return (
    <>
      <group position-z={layersindex}>
        {layers.map((layer) => (
          <MediaLayer key={`media${layer.id}`} id={layer.id} from="layers" />
        ))}
        <RenderLayer viewwidth={viewwidth} viewheight={viewheight}>
          <PerspectiveCamera
            ref={cameraref}
            makeDefault
            manual
            near={1}
            far={2000}
            aspect={viewwidth / viewheight}
          />
          <group ref={tiltref}>
            <group ref={focusref}>
              {layers.map((layer) => (
                <Mode7Layer
                  key={layer.id}
                  id={layer.id}
                  from="layers"
                  z={
                    layer.type === LAYER_TYPE.TILES && layer.tag === 'tickers'
                      ? RUNTIME.DRAW_CHAR_HEIGHT()
                      : 0
                  }
                />
              ))}
            </group>
          </group>
        </RenderLayer>
      </group>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
      <group ref={overref} position-z={overindex}>
        {over.map((layer, i) => (
          <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
        ))}
      </group>
    </>
  )
}

/*



*/
