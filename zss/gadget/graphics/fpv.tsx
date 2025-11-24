import { useFrame, useThree } from '@react-three/fiber'
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
  const { viewport } = useThree()
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight

  const pivotref = useRef<Group>(null)
  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((_, delta) => {
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
    }

    const userData = cameraref.current.userData ?? {}
    const fx = (userData.focusx + 0.5) * drawwidth
    const fy = (userData.focusy + 0.5) * drawheight

    // position camera
    damp3(pivotref.current.position, [-fx, fy, 0], animrate, delta)

    // point camera
    dampE(
      cameraref.current.rotation,
      [Math.PI * -0.5, control.facing, 0],
      animrate,
      delta,
    )

    // smoothed change in focus
    if (currentboard !== userData.currentboard) {
      userData.focusx = control.focusx
      userData.focusy = control.focusy
      userData.currentboard = currentboard
      pivotref.current.position.set(
        -((userData.focusx + 0.5) * drawwidth),
        -((userData.focusy + 0.5) * drawheight),
        0,
      )
    } else {
      damp(cameraref.current.userData, 'focusx', control.focusx, animrate)
      damp(cameraref.current.userData, 'focusy', control.focusy, animrate)
    }

    // // update effect
    // depthoffield.current.bokehScale = 5
    // depthoffield.current.cocMaterial.worldFocusRange = 1200
    // depthoffield.current.cocMaterial.worldFocusDistance = 100

    // update fov & matrix
    damp(cameraref.current, 'fov', maptofov(control.viewscale), animrate, delta)
    cameraref.current.updateProjectionMatrix()

    // framing
    overref.current.position.x = 0
    overref.current.position.y = viewheight - boarddrawheight

    const rscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    underref.current.position.x = viewwidth - boarddrawwidth * rscale
    underref.current.position.y = 0
    underref.current.scale.setScalar(rscale)
  })

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  const { gadget, gadgetlayercache } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const exiteast = gadgetlayercache[gadget.exiteast] ?? []
  const exitwest = gadgetlayercache[gadget.exitwest] ?? []
  const exitnorth = gadgetlayercache[gadget.exitnorth] ?? []
  const exitsouth = gadgetlayercache[gadget.exitsouth] ?? []

  const layersindex = under.length * 2 + 2
  const overindex = layersindex + 2

  const xmargin = viewport.width - viewwidth
  const ymargin = viewport.height - viewheight
  const centerx = viewwidth * -0.5 + xmargin * -0.5 + screensize.marginx
  const centery = viewheight * 0.5 + ymargin * 0.5 - screensize.marginy
  return (
    <>
      <group ref={pivotref}>
        <perspectiveCamera
          ref={cameraref}
          near={0.1}
          far={3000}
          aspect={-viewwidth / viewheight}
          rotation={[Math.PI * -0.5, 0, 0]}
          position={[0, 0, 512 + drawheight * 0.5]}
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
            <group position={[centerx, centery, 0]}>
              <group rotation={[0, 0, Math.PI]}>
                {layers.map((layer) => (
                  <FPVLayer
                    key={layer.id}
                    id={layer.id}
                    from="layers"
                    z={maptolayerz(layer)}
                  />
                ))}
                {exiteast.length && (
                  <group position={[BOARD_WIDTH * drawwidth, 0, 0]}>
                    {exiteast.map((layer) => (
                      <FPVLayer
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
                      <FPVLayer
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
                      <FPVLayer
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
                      <FPVLayer
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
