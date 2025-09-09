import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { useRef, useState } from 'react'
import {
  Group,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { useScreenSize } from '../userscreen'

import { FlatLayer } from './flatlayer'
import { MediaLayer } from './medialayer'
import { Mode7Layer } from './mode7layer'
import { RenderLayer } from './renderlayer'

type GraphicsProps = {
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

function mapviewtofocusrange(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 0.1
    default:
    case VIEWSCALE.MID:
      return 0.2
    case VIEWSCALE.FAR:
      return 0.15
  }
}

function mapviewtofocusy(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 0
    default:
    case VIEWSCALE.MID:
      return -500
    case VIEWSCALE.FAR:
      return 200
  }
}

function mapviewtofocusz(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 0
    default:
    case VIEWSCALE.MID:
      return 0
    case VIEWSCALE.FAR:
      return 0
  }
}

export function Mode7Graphics({ width, height }: GraphicsProps) {
  const screensize = useScreenSize()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const tiltref = useRef<Group>(null)
  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const focusref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)

  useFrame((state, delta) => {
    if (
      !tiltref.current ||
      !overref.current ||
      !underref.current ||
      !focusref.current ||
      !cameraref.current ||
      !depthoffield.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // drawsize
    const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
    const boarddrawwidth = BOARD_WIDTH * drawwidth
    const boarddrawheight = BOARD_HEIGHT * drawheight

    // setup tracking state
    if (!ispresent(focusref.current.userData.focusx)) {
      focusref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
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

    // calc focus
    let fx = focusref.current.userData.focusx
    let fy = focusref.current.userData.focusy
    fx *= -RUNTIME.DRAW_CHAR_WIDTH()
    fy *= -RUNTIME.DRAW_CHAR_HEIGHT()
    fx += boarddrawwidth * 0.5
    fy += boarddrawheight * 0.5

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
    damp3(
      focusref.current.position,
      [fx, fy + drawheight * 6, 0],
      animrate,
      delta,
    )

    // smoothed change in focus
    damp(focusref.current.userData, 'focusx', control.focusx, animrate)
    damp(focusref.current.userData, 'focusy', control.focusy, animrate)

    // center camera
    cameraref.current.rotation.z = Math.PI
    cameraref.current.position.x = state.size.width * 0.5
    cameraref.current.position.y = state.size.height * 0.5
    cameraref.current.updateProjectionMatrix()

    // adjust depth of field
    if (!ispresent(depthoffield.current.target)) {
      // eslint-disable-next-line @react-three/no-new-in-loop
      depthoffield.current.target = new Vector3()
    }

    depthoffield.current.cocMaterial.focusRange = mapviewtofocusrange(
      control.viewscale,
    )

    // depthoffield.current.target.x = cameraref.current.position.x
    depthoffield.current.target.y = mapviewtofocusy(control.viewscale)
    depthoffield.current.target.z = mapviewtofocusz(control.viewscale)
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

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight

  const centerx = boarddrawwidth * -0.5 + screensize.marginx
  const centery = boarddrawheight * -0.5 + -screensize.marginy

  const layersindex = under.length * 2 + 2
  const overindex = layersindex + 2

  const [, setcameraready] = useState(false)
  return (
    <>
      {layers.map((layer) => (
        <MediaLayer key={`media${layer.id}`} id={layer.id} from="layers" />
      ))}
      <perspectiveCamera
        ref={cameraref}
        near={1}
        far={2000}
        aspect={-viewwidth / viewheight}
        onUpdate={() => setcameraready(true)}
      />
      <group position-z={layersindex}>
        {cameraref.current && (
          <RenderLayer
            camera={cameraref.current}
            viewwidth={viewwidth}
            viewheight={viewheight}
            effects={
              <>
                <DepthOfField
                  ref={depthoffield}
                  focusRange={0.5}
                  bokehScale={5}
                />
              </>
            }
          >
            <group position={[centerx, centery, -1000]}>
              <group ref={tiltref}>
                <group ref={focusref}>
                  {layers.map((layer) => (
                    <Mode7Layer
                      key={layer.id}
                      id={layer.id}
                      from="layers"
                      z={0}
                    />
                  ))}
                </group>
              </group>
            </group>
          </RenderLayer>
        )}
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
