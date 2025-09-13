import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { useLayoutEffect, useRef, useState } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  LAYER,
  LAYER_TYPE,
  VIEWSCALE,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { useScreenSize } from '../userscreen'

import { FlatLayer } from './flatlayer'
import { FPVLayer } from './fpvlayer'
import { MediaLayer } from './medialayer'
import { RenderLayer } from './renderlayer'

type GraphicsProps = {
  width: number
  height: number
}

function maptolayerz(layer: LAYER): number {
  switch (layer.type) {
    case LAYER_TYPE.TILES:
      return 0
    case LAYER_TYPE.DITHER:
      return RUNTIME.DRAW_CHAR_HEIGHT() + 1
    case LAYER_TYPE.SPRITES:
      return RUNTIME.DRAW_CHAR_HEIGHT() * 0.5
  }
  return 0
}

function maptotilt(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 0.1
    default:
    case VIEWSCALE.MID:
      return 0.2
    case VIEWSCALE.FAR:
      return 0.3
  }
}

function maptobackup(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 64
    default:
    case VIEWSCALE.MID:
      return 16
    case VIEWSCALE.FAR:
      return 0
  }
}

function maptofov(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 25
    default:
    case VIEWSCALE.MID:
      return 45
    case VIEWSCALE.FAR:
      return 90
  }
}

export function FPVGraphics({ width, height }: GraphicsProps) {
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight

  const pivotref = useRef<Group>(null)
  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((state, delta) => {
    if (
      !pivotref.current ||
      !overref.current ||
      !underref.current ||
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

    // viewsize
    const viewwidth = width * drawwidth
    const viewheight = height * drawheight

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      cameraref.current.userData = {
        focusx: control.focusx,
      }
    }

    // framing
    overref.current.position.x = 0
    overref.current.position.y = viewheight - boarddrawheight

    const rscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    underref.current.position.x = viewwidth - boarddrawwidth * rscale
    underref.current.position.y = 0
    underref.current.scale.setScalar(rscale)

    const animrate = 0.05

    // calc focus
    let fx = control.focusx - 0.5
    let fy = control.focusy + 0.5
    fx *= -drawwidth
    fy *= -drawheight

    // turn camera
    dampE(
      pivotref.current.rotation,
      [0, Math.PI + control.facing, 0],
      animrate,
      delta,
    )

    // tilt camera
    dampE(
      cameraref.current.rotation,
      [maptotilt(control.viewscale), 0, 0],
      animrate,
      delta,
    )

    // move camera
    damp3(
      pivotref.current.position,
      [
        state.size.width * 0.5 - fx,
        state.size.height * 0.5 - drawheight * 0.25 + 1,
        fy,
      ],
      animrate,
      delta,
    )

    damp3(
      cameraref.current.position,
      [0, 0, maptobackup(control.viewscale)],
      animrate,
      delta,
    )
    //

    // update effect
    depthoffield.current.bokehScale = 5
    depthoffield.current.cocMaterial.worldFocusRange = 1200
    depthoffield.current.cocMaterial.worldFocusDistance = 100

    // update fov & matrix
    damp(cameraref.current, 'fov', maptofov(control.viewscale), animrate, delta)

    //
    cameraref.current.updateProjectionMatrix()
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
      {layers.map((layer) => (
        <MediaLayer key={`media${layer.id}`} id={layer.id} from="layers" />
      ))}
      <group ref={pivotref}>
        <perspectiveCamera
          ref={cameraref}
          near={1}
          far={3000}
          aspect={-viewwidth / viewheight}
        />
      </group>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
      <group position-z={layersindex}>
        {cameraref.current && (
          <RenderLayer
            camera={cameraref.current}
            viewwidth={viewwidth}
            viewheight={viewheight}
            effects={
              <>
                <DepthOfField ref={depthoffield} />
              </>
            }
          >
            <group position={[-screensize.marginx, -screensize.marginy, -512]}>
              <group
                rotation={[Math.PI * -0.5, 0, 0]}
                position={[0, drawheight * -0.75, 0]}
              >
                {layers.map((layer) => (
                  <FPVLayer
                    key={layer.id}
                    id={layer.id}
                    from="layers"
                    z={maptolayerz(layer)}
                  />
                ))}
              </group>
            </group>
          </RenderLayer>
        )}
      </group>
      <group ref={overref} position-z={overindex}>
        {over.map((layer, i) => (
          <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
        ))}
      </group>
    </>
  )
}
