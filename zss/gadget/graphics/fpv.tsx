/* eslint-disable react/no-unknown-property */
import { useFrame, useThree } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
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
import { DepthFog } from 'zss/gadget/fx/depthfog'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'

import { FlatLayer } from './flatlayer'
import { FPVLayer } from './fpvlayer'
import { PillarwMeshes } from './pillarmeshes'
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

function maptofov(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 25
    default:
    case VIEWSCALE.MID:
      return 75
    case VIEWSCALE.FAR:
      return 110
  }
}

// board edge meshes
const edgechars: number[] = []
const edgecolors: number[] = []
const edgebgs: number[] = []
for (let y = 0; y < BOARD_HEIGHT; ++y) {
  for (let x = 0; x < BOARD_WIDTH; ++x) {
    if (x === 0 || x === BOARD_WIDTH - 1 || y === 0 || y === BOARD_HEIGHT - 1) {
      edgechars.push(32)
      edgecolors.push(COLOR.BLACK)
      edgebgs.push(COLOR.BLACK)
    } else {
      edgechars.push(0)
      edgecolors.push(0)
      edgebgs.push(COLOR.ONCLEAR)
    }
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

  const positionref = useRef<Group>(null)
  const tiltref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((_, delta) => {
    if (
      !positionref.current ||
      !tiltref.current ||
      !underref.current ||
      !cameraref.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    const animrate = 0.05
    const animrateslow = 0.111
    const currentboard = useGadgetClient.getState().gadget.board

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      cameraref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        lfocusx: control.focusx,
        lfocusy: control.focusy,
        facing: control.facing,
        lfacing: control.facing,
        sway: 0,
        vsway: 0,
        lean: 0,
        vlean: 0,
        currentboard,
      }
    }

    const userData = cameraref.current.userData ?? {}
    const fx = (userData.focusx + 0.5) * drawwidth
    const fy = (userData.focusy + 0.5) * drawheight

    // track movement
    if (
      userData.lfocusx !== control.focusx ||
      userData.lfocusy !== control.focusy
    ) {
      const swayscale = 7
      const leanscale = 0.02
      const dx = userData.lfocusx - control.focusx
      const dy = userData.lfocusy - control.focusy
      const mappedfacing = Math.round(control.facing / (Math.PI * 0.5))
      switch (mappedfacing) {
        default:
        case 0: // north
          userData.vsway = dy * swayscale
          userData.vlean = dx * leanscale
          break
        case 1: // east
          userData.vsway = -dx * swayscale
          userData.vlean = dy * leanscale
          break
        case 2: // south
          userData.vsway = -dy * swayscale
          userData.vlean = -dx * leanscale
          break
        case 3: // west
          userData.vsway = dx * swayscale
          userData.vlean = -dy * leanscale
          break
      }
      userData.lfocusx = control.focusx
      userData.lfocusy = control.focusy
    }

    // track turning
    if (userData.lfacing !== control.facing) {
      let df = control.facing - userData.lfacing
      if (df < -Math.PI) {
        df += Math.PI * 2
      } else if (df > Math.PI) {
        df += Math.PI * -2
      }
      const leanscale = 0.02
      userData.vlean = df * leanscale
      userData.lfacing = control.facing
    }

    // position camera
    damp3(
      positionref.current.position,
      [fx, -fy, 512 + drawheight * 0.55],
      animrate,
      delta,
    )

    // point camera
    dampE(
      tiltref.current.rotation,
      [0, 0, Math.PI - control.facing],
      animrate,
      delta,
    )

    // tilt camera
    dampE(
      cameraref.current.rotation,
      [Math.PI * -0.49, 0, userData.lean],
      animrate,
      delta,
    )

    // pull back from pivot point
    const srange = 1.2
    const swx = Math.sin(userData.sway) * srange
    const swy = Math.abs(Math.sin(userData.sway) * srange)
    damp3(cameraref.current.position, [swx, 0, swy], animrate, delta)

    // smoothed sway
    userData.sway += userData.vsway * delta
    damp(cameraref.current.userData, 'vsway', 0, animrateslow)

    // smoothed lean
    damp(cameraref.current.userData, 'lean', userData.vlean, animrateslow)
    damp(cameraref.current.userData, 'vlean', 0, animrateslow)

    // smoothed change in focus
    if (currentboard !== userData.currentboard) {
      // hard reset
      userData.sway = 0
      userData.vsway = 0
      userData.lean = 0
      userData.vlean = 0
      userData.focusx = control.focusx
      userData.focusy = control.focusy
      userData.lfocusx = userData.focusx
      userData.lfocusy = userData.focusy
      userData.currentboard = currentboard
      const ffx = (userData.focusx + 0.5) * drawwidth
      const ffy = (userData.focusy + 0.5) * drawheight
      positionref.current.position.set(ffx, -ffy, 512 + drawheight * 0.5)
      const swx = Math.sin(userData.sway) * srange
      const swy = Math.abs(Math.sin(userData.sway) * srange)
      cameraref.current.position.set(swx, 0, swy)
      cameraref.current.rotation.set(Math.PI * -0.49, 0, userData.lean)
    } else {
      damp(cameraref.current.userData, 'focusx', control.focusx, animrate)
      damp(cameraref.current.userData, 'focusy', control.focusy, animrate)
    }

    // update fov & matrix
    damp(cameraref.current, 'fov', maptofov(control.viewscale), animrate, delta)
    cameraref.current.updateProjectionMatrix()

    // framing
    const rscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    underref.current.position.x = viewwidth - boarddrawwidth * rscale
    underref.current.position.y = 0
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

  const multi = over.length > 0
  const layersindex = under.length * 2 + 2
  const centerx = viewport.width * -0.5 + screensize.marginx
  const centery = viewport.height * 0.5 - screensize.marginy
  return (
    <>
      <group ref={positionref}>
        <group ref={tiltref}>
          <perspectiveCamera
            ref={cameraref}
            near={0.1}
            far={3000}
            aspect={-viewwidth / viewheight}
            position={[0, drawheight * -0.5, 0]}
          />
        </group>
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
                <DepthOfField
                  worldFocusDistance={200}
                  worldFocusRange={500}
                  bokehScale={3}
                />
                <DepthFog />
              </>
            }
          >
            <group position={[centerx, centery, 0]}>
              {layers.map((layer) => (
                <FPVLayer
                  key={layer.id}
                  id={layer.id}
                  from="layers"
                  z={maptolayerz(layer)}
                  multi={multi}
                />
              ))}
              {over.map((layer) => (
                <FPVLayer
                  key={layer.id}
                  from="over"
                  id={layer.id}
                  z={maptolayerz(layer) + drawheight + 1}
                  multi={multi}
                />
              ))}
              <group position={[BOARD_WIDTH * drawwidth, 0, 0]}>
                {exiteast.length ? (
                  <>
                    {exiteast.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={exiteast}
                        z={maptolayerz(layer)}
                        multi={multi}
                      />
                    ))}
                  </>
                ) : (
                  <group scale-z={2}>
                    <PillarwMeshes
                      width={BOARD_WIDTH}
                      char={edgechars}
                      color={edgecolors}
                      bg={edgebgs}
                    />
                  </group>
                )}
              </group>
              <group position={[BOARD_WIDTH * -drawwidth, 0, 0]}>
                {exitwest.length ? (
                  <>
                    {exitwest.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={exitwest}
                        z={maptolayerz(layer)}
                        multi={multi}
                      />
                    ))}
                  </>
                ) : (
                  <group scale-z={2}>
                    <PillarwMeshes
                      width={BOARD_WIDTH}
                      char={edgechars}
                      color={edgecolors}
                      bg={edgebgs}
                    />
                  </group>
                )}
              </group>
              <group position={[0, BOARD_HEIGHT * -drawheight, 0]}>
                {exitnorth.length ? (
                  <>
                    {exitnorth.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={exitnorth}
                        z={maptolayerz(layer)}
                        multi={multi}
                      />
                    ))}
                  </>
                ) : (
                  <group scale-z={2}>
                    <PillarwMeshes
                      width={BOARD_WIDTH}
                      char={edgechars}
                      color={edgecolors}
                      bg={edgebgs}
                    />
                  </group>
                )}
              </group>
              <group position={[0, BOARD_HEIGHT * drawheight, 0]}>
                {exitsouth.length ? (
                  <>
                    {exitsouth.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={exitsouth}
                        z={maptolayerz(layer)}
                        multi={multi}
                      />
                    ))}
                  </>
                ) : (
                  <group scale-z={2}>
                    <PillarwMeshes
                      width={BOARD_WIDTH}
                      char={edgechars}
                      color={edgecolors}
                      bg={edgebgs}
                    />
                  </group>
                )}
              </group>
            </group>
          </RenderLayer>
        )}
      </group>
    </>
  )
}
