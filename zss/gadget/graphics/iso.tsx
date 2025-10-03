import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3 } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { useLayoutEffect, useRef, useState } from 'react'
import { Group, OrthographicCamera as OrthographicCameraImpl } from 'three'
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

import { useScreenSize } from '../userscreen'

import { FlatLayer } from './flatlayer'
import { IsoLayer } from './isolayer'
import { MediaLayers } from './medialayer'
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
      return RUNTIME.DRAW_CHAR_HEIGHT() * 0.75
  }
  return 0
}

function maptoscale(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 6
    default:
    case VIEWSCALE.MID:
      return 3
    case VIEWSCALE.FAR:
      return 1.2
  }
}

export function IsoGraphics({ width, height }: GraphicsProps) {
  const screensize = useScreenSize()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const zoomref = useRef<Group>(null)
  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const focusref = useRef<Group>(null)
  const cameraref = useRef<OrthographicCameraImpl>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((state, delta) => {
    if (
      !zoomref.current ||
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

    // viewsize
    const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
    const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

    // setup tracking state
    if (!ispresent(focusref.current.userData.focusx)) {
      zoomref.current.scale.setScalar(control.viewscale)
      focusref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        focuslx: control.focusx,
        focusly: control.focusy,
        focusvx: 0,
        focusvy: 0,
        facing: control.facing,
        focusz: 0,
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
    const focusx = focusref.current.userData.focusx + 0.5
    const focusy = focusref.current.userData.focusy + 0.5
    const fx = focusx * drawwidth
    const fy = focusy * drawheight

    // zoom
    damp3(zoomref.current.scale, maptoscale(control.viewscale), animrate, delta)

    // focus
    damp3(focusref.current.position, [-fx, -fy, 0], animrate, delta)

    // smoothed change in focus
    damp(focusref.current.userData, 'focusx', control.focusx, animrate)
    damp(focusref.current.userData, 'focusy', control.focusy, animrate)

    // center camera
    cameraref.current.position.x = state.size.width * 0.5
    cameraref.current.position.y = state.size.height * 0.5
    cameraref.current.updateProjectionMatrix()

    // update dof
    switch (control.viewscale) {
      case VIEWSCALE.NEAR:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 600
        depthoffield.current.cocMaterial.worldFocusDistance = 1000
        break
      default:
      case VIEWSCALE.MID:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1000
        depthoffield.current.cocMaterial.worldFocusDistance = 1000
        break
      case VIEWSCALE.FAR:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1500
        depthoffield.current.cocMaterial.worldFocusDistance = 1000
        break
    }
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
        <MediaLayers />
        <orthographicCamera
          ref={cameraref}
          left={viewwidth * -0.5}
          right={viewwidth * 0.5}
          top={viewheight * -0.5}
          bottom={viewheight * 0.5}
          near={1}
          far={2000}
          position={[0, 0, 1000]}
        />
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
            <group position={[screensize.marginx, screensize.marginy, -500]}>
              <group rotation={[Math.PI * 0.25, 0, Math.PI * -0.25]}>
                <group ref={zoomref}>
                  <group ref={focusref}>
                    {layers.map((layer) => (
                      <IsoLayer
                        key={layer.id}
                        id={layer.id}
                        from="layers"
                        z={maptolayerz(layer)}
                      />
                    ))}
                  </group>
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
