import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { memo, useCallback, useRef, useState } from 'react'
import {
  Group,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from 'three'
import { RUNTIME } from 'zss/config'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { DepthFog } from 'zss/gadget/fx/depthfog'
import { dampfocus, initfocusifneeded } from 'zss/gadget/graphics/camerafocus'
import { resolveexitpreview } from 'zss/gadget/graphics/exitpreviewresolve'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { FPVLayer } from 'zss/gadget/graphics/fpvlayer'
import { maptolayerz, maxspriteslayerz } from 'zss/gadget/graphics/layerz'
import { PillarwMeshes } from 'zss/gadget/graphics/pillarmeshes'
import { RenderLayer } from 'zss/gadget/graphics/renderlayer'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

type GraphicsProps = {
  width: number
  height: number
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

const FOV_MATRIX_EPS = 1e-3

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

export const FPVGraphics = memo(function FPVGraphics({
  width,
  height,
}: GraphicsProps) {
  const screensize = useScreenSize()
  const islowrez = useDeviceData((s) => s.islowrez)
  const gpudprscale = useDeviceData((s) => s.gpudprscale)
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight
  const cameraz = 512 + drawheight * 0.55
  const sidebarnudge = screensize.viewwidth - viewwidth
  const centerx = viewwidth * -0.5 + sidebarnudge * -0.5
  const centery = viewheight * 0.5

  const positionref = useRef<Group>(null)
  const tiltref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)
  const dofboardref = useRef<Group>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)
  const dofplayerworld = useRef(new Vector3())
  const dofcamworld = useRef(new Vector3())
  const lastprojfovref = useRef(Number.NaN)
  const [boardcamera, setboardcamera] = useState<PerspectiveCameraImpl | null>(
    null,
  )

  const bindboardcamera = useCallback((c: PerspectiveCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
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

    const { gadget } = useGadgetClient.getState()
    const { layers = [] } = gadget
    const control = layersreadcontrol(layers)
    const currentboard = gadget.board

    const animrate = 0.05
    const animrateslow = 0.111

    const userdata = (cameraref.current.userData ??= {})
    if (initfocusifneeded(userdata, control, currentboard)) {
      userdata.lfocusx = control.focusx
      userdata.lfocusy = control.focusy
      userdata.lfacing = control.facing
      userdata.sway = 0
      userdata.vsway = 0
      userdata.lean = 0
      userdata.vlean = 0
    }

    const fx = (userdata.focusx! + 0.5) * drawwidth
    const fy = (userdata.focusy! + 0.5) * drawheight

    if (
      userdata.lfocusx !== control.focusx ||
      userdata.lfocusy !== control.focusy
    ) {
      const swayscale = 7
      const leanscale = 0.02
      const dx = userdata.lfocusx - control.focusx
      const dy = userdata.lfocusy! - control.focusy
      const mappedfacing = Math.round(control.facing / (Math.PI * 0.5))
      switch (mappedfacing) {
        default:
        case 0: // north
          userdata.vsway = dy * swayscale
          userdata.vlean = dx * leanscale
          break
        case 1: // east
          userdata.vsway = -dx * swayscale
          userdata.vlean = dy * leanscale
          break
        case 2: // south
          userdata.vsway = -dy * swayscale
          userdata.vlean = -dx * leanscale
          break
        case 3: // west
          userdata.vsway = dx * swayscale
          userdata.vlean = -dy * leanscale
          break
      }
      userdata.lfocusx = control.focusx
      userdata.lfocusy = control.focusy
    }

    if (userdata.lfacing !== control.facing) {
      let df = control.facing - userdata.lfacing!
      if (df < -Math.PI) {
        df += Math.PI * 2
      } else if (df > Math.PI) {
        df += Math.PI * -2
      }
      const leanscale = 0.02
      userdata.vlean = df * leanscale
      userdata.lfacing = control.facing
    }

    damp3(positionref.current.position, [fx, -fy, cameraz], animrate, delta)

    dampE(
      tiltref.current.rotation,
      [0, 0, Math.PI - control.facing],
      animrate,
      delta,
    )

    dampE(
      cameraref.current.rotation,
      [Math.PI * -0.49, 0, userdata.lean ?? 0],
      animrate,
      delta,
    )

    const srange = 1.2
    const swx = Math.sin(userdata.sway ?? 0) * srange
    const swy = Math.abs(Math.sin(userdata.sway ?? 0) * srange)
    damp3(cameraref.current.position, [swx, 0, swy], animrate, delta)

    userdata.sway = (userdata.sway ?? 0) + (userdata.vsway ?? 0) * delta
    damp(cameraref.current.userData, 'vsway', 0, animrateslow)

    damp(cameraref.current.userData, 'lean', userdata.vlean ?? 0, animrateslow)
    damp(cameraref.current.userData, 'vlean', 0, animrateslow)

    if (currentboard !== userdata.currentboard) {
      userdata.sway = 0
      userdata.vsway = 0
      userdata.lean = 0
      userdata.vlean = 0
      userdata.focusx = control.focusx
      userdata.focusy = control.focusy
      userdata.lfocusx = userdata.focusx
      userdata.lfocusy = userdata.focusy
      userdata.currentboard = currentboard
      const ffx = (userdata.focusx + 0.5) * drawwidth
      const ffy = (userdata.focusy + 0.5) * drawheight
      positionref.current.position.set(ffx, -ffy, cameraz)
      const rsx = Math.sin(userdata.sway ?? 0) * srange
      const rsy = Math.abs(Math.sin(userdata.sway ?? 0) * srange)
      cameraref.current.position.set(rsx, 0, rsy)
      cameraref.current.rotation.set(Math.PI * -0.49, 0, userdata.lean ?? 0)
    } else {
      dampfocus(userdata, control, animrate)
    }

    damp(cameraref.current, 'fov', maptofov(control.viewscale), animrate, delta)
    const lpr = lastprojfovref.current
    if (
      !Number.isFinite(lpr) ||
      Math.abs(cameraref.current.fov - lpr) > FOV_MATRIX_EPS
    ) {
      cameraref.current.updateProjectionMatrix()
      lastprojfovref.current = cameraref.current.fov
    }

    const xscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    const yscale = clamp(viewheight / boarddrawheight, 1.0, 10.0)
    const rscale = Math.max(xscale, yscale)
    const rwidth = boarddrawwidth * rscale
    const rheight = boarddrawheight * rscale
    underref.current.position.x = viewwidth - rwidth
    underref.current.position.y = viewheight - rheight
    underref.current.scale.setScalar(rscale)

    if (depthoffield.current && dofboardref.current) {
      switch (control.viewscale) {
        case VIEWSCALE.NEAR:
          depthoffield.current.bokehScale = 10
          depthoffield.current.cocMaterial.worldFocusRange = 1800
          break
        default:
        case VIEWSCALE.MID:
          depthoffield.current.bokehScale = 10
          depthoffield.current.cocMaterial.worldFocusRange = 2550
          break
        case VIEWSCALE.FAR:
          depthoffield.current.bokehScale = 10
          depthoffield.current.cocMaterial.worldFocusRange = 2550
          break
      }

      const playerspritez = maxspriteslayerz(layers, 'fpv')
      dofboardref.current.updateMatrixWorld(true)
      dofplayerworld.current.set(
        (control.focusx + 0.5) * drawwidth,
        (control.focusy + 0.5) * drawheight,
        playerspritez,
      )
      dofboardref.current.localToWorld(dofplayerworld.current)
      cameraref.current.getWorldPosition(dofcamworld.current)
      depthoffield.current.cocMaterial.focusDistance =
        dofcamworld.current.distanceTo(dofplayerworld.current)
    }
  })

  // re-render when board or layer counts change (board change must trigger re-render)
  useGadgetClient((state) => state.gadgetwiretick)
  useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  useGadgetClient(
    useShallow((state) => ({
      exiteast: state.gadget.exiteast,
      exitwest: state.gadget.exitwest,
      exitnorth: state.gadget.exitnorth,
      exitsouth: state.gadget.exitsouth,
      exitne: state.gadget.exitne,
      exitnw: state.gadget.exitnw,
      exitse: state.gadget.exitse,
      exitsw: state.gadget.exitsw,
    })),
  )

  const { gadget, layercachemap } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const hasunderboard = under.length > 0
  const east = resolveexitpreview(
    gadget.exiteast,
    layercachemap,
    'e',
    hasunderboard,
  )
  const west = resolveexitpreview(
    gadget.exitwest,
    layercachemap,
    'w',
    hasunderboard,
  )
  const north = resolveexitpreview(
    gadget.exitnorth,
    layercachemap,
    'n',
    hasunderboard,
  )
  const south = resolveexitpreview(
    gadget.exitsouth,
    layercachemap,
    's',
    hasunderboard,
  )
  const ne = resolveexitpreview(
    gadget.exitne,
    layercachemap,
    'ne',
    hasunderboard,
  )
  const nw = resolveexitpreview(
    gadget.exitnw,
    layercachemap,
    'nw',
    hasunderboard,
  )
  const se = resolveexitpreview(
    gadget.exitse,
    layercachemap,
    'se',
    hasunderboard,
  )
  const sw = resolveexitpreview(
    gadget.exitsw,
    layercachemap,
    'sw',
    hasunderboard,
  )

  const multi = over.length > 0
  const layersindex = under.length * 2 + 2
  const fpvdprscale = Math.min(gpudprscale, islowrez ? 0.5 : 1)

  return (
    <>
      <group ref={positionref}>
        <group ref={tiltref}>
          <perspectiveCamera
            ref={bindboardcamera}
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
        {boardcamera && (
          <RenderLayer
            camera={boardcamera}
            viewwidth={viewwidth}
            viewheight={viewheight}
            dprscale={fpvdprscale}
            effects={
              <>
                <DepthOfField ref={depthoffield} />
                {!islowrez && <DepthFog />}
              </>
            }
          >
            <group ref={dofboardref} position={[centerx, centery, 0]}>
              {layers.map((layer) => (
                <FPVLayer
                  key={layer.id}
                  id={layer.id}
                  from="layers"
                  z={maptolayerz(layer, 'fpv')}
                  multi={multi}
                />
              ))}
              {over.map((layer) => (
                <FPVLayer
                  key={layer.id}
                  from="over"
                  id={layer.id}
                  z={maptolayerz(layer, 'fpv') + drawheight + 1}
                  multi={multi}
                />
              ))}
              <group position={[BOARD_WIDTH * drawwidth, 0, 0]}>
                {east.layers.length > 0 ? (
                  <>
                    {east.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={east.layers}
                        z={maptolayerz(layer, 'fpv')}
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
                {west.layers.length > 0 ? (
                  <>
                    {west.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={west.layers}
                        z={maptolayerz(layer, 'fpv')}
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
                {north.layers.length > 0 ? (
                  <>
                    {north.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={north.layers}
                        z={maptolayerz(layer, 'fpv')}
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
                {south.layers.length > 0 ? (
                  <>
                    {south.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={south.layers}
                        z={maptolayerz(layer, 'fpv')}
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
              {ne.layers.length > 0 && (
                <group
                  position={[
                    BOARD_WIDTH * drawwidth,
                    BOARD_HEIGHT * -drawheight,
                    0,
                  ]}
                >
                  <>
                    {ne.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={ne.layers}
                        z={maptolayerz(layer, 'fpv')}
                        multi={multi}
                      />
                    ))}
                  </>
                </group>
              )}
              {nw.layers.length > 0 && (
                <group
                  position={[
                    BOARD_WIDTH * -drawwidth,
                    BOARD_HEIGHT * -drawheight,
                    0,
                  ]}
                >
                  <>
                    {nw.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={nw.layers}
                        z={maptolayerz(layer, 'fpv')}
                        multi={multi}
                      />
                    ))}
                  </>
                </group>
              )}
              {se.layers.length > 0 && (
                <group
                  position={[
                    BOARD_WIDTH * drawwidth,
                    BOARD_HEIGHT * drawheight,
                    0,
                  ]}
                >
                  <>
                    {se.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={se.layers}
                        z={maptolayerz(layer, 'fpv')}
                        multi={multi}
                      />
                    ))}
                  </>
                </group>
              )}
              {sw.layers.length > 0 && (
                <group
                  position={[
                    BOARD_WIDTH * -drawwidth,
                    BOARD_HEIGHT * drawheight,
                    0,
                  ]}
                >
                  <>
                    {sw.layers.map((layer) => (
                      <FPVLayer
                        key={layer.id}
                        id={layer.id}
                        layers={sw.layers}
                        z={maptolayerz(layer, 'fpv')}
                        multi={multi}
                      />
                    ))}
                  </>
                </group>
              )}
              <InspectorComponent z={-1.9} />
            </group>
          </RenderLayer>
        )}
      </group>
    </>
  )
})
