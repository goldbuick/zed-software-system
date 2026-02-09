/* eslint-disable react/no-unknown-property */
import { useFrame, useThree } from '@react-three/fiber'
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
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { FlatLayer } from './flatlayer'
import { IsoLayer } from './isolayer'
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
      return RUNTIME.DRAW_CHAR_HEIGHT()
    case LAYER_TYPE.SPRITES:
      return RUNTIME.DRAW_CHAR_HEIGHT() * 0.75
  }
  return 0
}

function maptoscale(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 3
    default:
    case VIEWSCALE.MID:
      return 1.75
    case VIEWSCALE.FAR:
      return 1
  }
}

export function IsoGraphics({ width, height }: GraphicsProps) {
  const { viewport } = useThree()
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight

  const zoomref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cornerref = useRef<Group>(null)
  const cameraref = useRef<OrthographicCameraImpl>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((_, delta) => {
    if (
      !zoomref.current ||
      !underref.current ||
      !cornerref.current ||
      !cameraref.current ||
      !depthoffield.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    const animrate = 0.05
    const currentboard = useGadgetClient.getState().gadget.board

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      cameraref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        facing: control.facing,
        currentboard,
      }
      zoomref.current.scale.setScalar(control.viewscale)
    }

    const userData = cameraref.current.userData ?? {}
    const fx = (userData.focusx + 0.5) * drawwidth
    const fy = (userData.focusy + 0.5) * drawheight

    // zoom
    damp3(zoomref.current.scale, maptoscale(control.viewscale), animrate, delta)

    // pan
    damp3(cornerref.current.position, [-fx, -fy, 0], animrate, delta)

    // smoothed change in focus
    if (currentboard !== userData.currentboard) {
      userData.focusx = control.focusx
      userData.focusy = control.focusy
      userData.currentboard = currentboard
      cornerref.current.position.set(
        -((userData.focusx + 0.5) * drawwidth),
        -((userData.focusy + 0.5) * drawheight),
        0,
      )
    } else {
      damp(cameraref.current.userData, 'focusx', control.focusx, animrate)
      damp(cameraref.current.userData, 'focusy', control.focusy, animrate)
    }

    // update dof
    switch (control.viewscale) {
      case VIEWSCALE.NEAR:
        depthoffield.current.bokehScale = 5
        depthoffield.current.cocMaterial.worldFocusRange = 1000
        depthoffield.current.cocMaterial.worldFocusDistance = 1000
        break
      default:
      case VIEWSCALE.MID:
        depthoffield.current.bokehScale = 5
        depthoffield.current.cocMaterial.worldFocusRange = 1000
        depthoffield.current.cocMaterial.worldFocusDistance = 1000
        break
      case VIEWSCALE.FAR:
        depthoffield.current.bokehScale = 5
        depthoffield.current.cocMaterial.worldFocusRange = 1500
        depthoffield.current.cocMaterial.worldFocusDistance = 1000
        break
    }

    // camera changes
    cameraref.current.updateProjectionMatrix()

    // framing
    const xscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    const yscale = clamp(viewheight / boarddrawheight, 1.0, 10.0)
    const rscale = Math.max(xscale, yscale)
    const rwidth = boarddrawwidth * rscale
    const rheight = boarddrawheight * rscale
    underref.current.position.x = viewwidth - rwidth
    underref.current.position.y = viewheight - rheight
    underref.current.scale.setScalar(rscale)
  })

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  const { gadget, layercache: gadgetlayercache } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const exiteast = gadgetlayercache[gadget.exiteast] ?? []
  const exitwest = gadgetlayercache[gadget.exitwest] ?? []
  const exitnorth = gadgetlayercache[gadget.exitnorth] ?? []
  const exitsouth = gadgetlayercache[gadget.exitsouth] ?? []

  const layersindex = under.length * 2 + 2
  const centerx = viewport.width * -0.5 + screensize.marginx
  const centery = viewport.height * 0.5 - screensize.marginy
  return (
    <>
      <group position-z={layersindex}>
        <orthographicCamera
          ref={cameraref}
          left={viewwidth * -0.5}
          right={viewwidth * 0.5}
          top={viewheight * -0.5}
          bottom={viewheight * 0.5}
          near={0.1}
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
            <group position={[centerx, centery, -500]}>
              <group rotation={[Math.PI * 0.25, 0, Math.PI * -0.25]}>
                <group ref={zoomref}>
                  <group ref={cornerref}>
                    {layers.map((layer) => (
                      <IsoLayer
                        key={layer.id}
                        id={layer.id}
                        from="layers"
                        z={maptolayerz(layer)}
                      />
                    ))}
                    {over.map((layer) => (
                      <IsoLayer
                        key={layer.id}
                        from="over"
                        id={layer.id}
                        z={maptolayerz(layer) + drawheight + 1}
                      />
                    ))}
                    {exiteast.length && (
                      <group position={[BOARD_WIDTH * drawwidth, 0, 0]}>
                        {exiteast.map((layer) => (
                          <IsoLayer
                            key={layer.id}
                            id={layer.id}
                            layers={exiteast}
                            z={maptolayerz(layer)}
                          />
                        ))}
                      </group>
                    )}
                    {exitwest.length && (
                      <group position={[BOARD_WIDTH * -drawwidth, 0, 0]}>
                        {exitwest.map((layer) => (
                          <IsoLayer
                            key={layer.id}
                            id={layer.id}
                            layers={exitwest}
                            z={maptolayerz(layer)}
                          />
                        ))}
                      </group>
                    )}
                    {exitnorth.length && (
                      <group position={[0, BOARD_HEIGHT * -drawheight, 0]}>
                        {exitnorth.map((layer) => (
                          <IsoLayer
                            key={layer.id}
                            id={layer.id}
                            layers={exitnorth}
                            z={maptolayerz(layer)}
                          />
                        ))}
                      </group>
                    )}
                    {exitsouth.length && (
                      <group position={[0, BOARD_HEIGHT * drawheight, 0]}>
                        {exitsouth.map((layer) => (
                          <IsoLayer
                            key={layer.id}
                            id={layer.id}
                            layers={exitsouth}
                            z={maptolayerz(layer)}
                          />
                        ))}
                      </group>
                    )}
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
    </>
  )
}
