import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp3, dampE } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { memo, useCallback, useRef, useState } from 'react'
import {
  Group,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import {
  FOCUS_ANIM_RATE,
  initfocusifneeded,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import { buildexitpreviewgroups } from 'zss/gadget/graphics/exitpreviewgroups'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { maptolayerz, maxspriteslayerz } from 'zss/gadget/graphics/layerz'
import { Mode7Layer } from 'zss/gadget/graphics/mode7layer'
import {
  MODE7_Z_FAR,
  MODE7_Z_MID,
  MODE7_Z_NEAR,
} from 'zss/gadget/graphics/mode7viewscale'
import { RenderLayer } from 'zss/gadget/graphics/renderlayer'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'
import { useShallow } from 'zustand/react/shallow'

type GraphicsProps = {
  width: number
  height: number
}

function mapviewtoz(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return MODE7_Z_NEAR
    default:
    case VIEWSCALE.MID:
      return MODE7_Z_MID
    case VIEWSCALE.FAR:
      return MODE7_Z_FAR
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

function mapviewtoviewmeasure(viewscale: number) {
  switch (viewscale as VIEWSCALE) {
    case VIEWSCALE.NEAR:
      return 1.2
    default:
    case VIEWSCALE.MID:
      return 1.5
    case VIEWSCALE.FAR:
      return 1.0
  }
}

function clampfocus(
  focusx: number,
  focusy: number,
  viewscale: VIEWSCALE,
  viewwidth: number,
  viewheight: number,
  drawwidth: number,
  drawheight: number,
) {
  const margin = 3
  const tiltscale = mapviewtoviewmeasure(viewscale)
  const charwidth = drawwidth * viewscale * tiltscale
  const charheight = drawheight * viewscale * tiltscale
  const viewcols = Math.floor((viewwidth / charwidth) * 0.5) - margin
  const viewrows = Math.floor((viewheight / charheight) * 0.5) - margin
  const maxcols = Math.round(BOARD_WIDTH - viewcols)
  const maxrows = Math.round(BOARD_HEIGHT - viewrows)
  const shouldcenterx = BOARD_WIDTH - viewcols * 2 < 0
  const shouldcentery = BOARD_HEIGHT - viewrows * 2 < 0
  return [
    shouldcenterx
      ? Math.round(BOARD_WIDTH * 0.5)
      : clamp(focusx, viewcols, maxcols),
    shouldcentery
      ? Math.round(BOARD_HEIGHT * 0.5)
      : clamp(focusy, viewrows, maxrows),
  ]
}

export const Mode7Graphics = memo(function Mode7Graphics({
  width,
  height,
}: GraphicsProps) {
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight
  const sidebarnudge = screensize.viewwidth - viewwidth
  const centerx = viewwidth * -0.5 + sidebarnudge * -0.5
  const centery = viewheight * 0.5

  const tiltref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cornerref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)
  const [boardcamera, setboardcamera] = useState<PerspectiveCameraImpl | null>(
    null,
  )
  const depthoffield = useRef<DepthOfFieldEffect>(null)
  const dofplayerworld = useRef(new Vector3())
  const dofcamworld = useRef(new Vector3())

  const bindboardcamera = useCallback((c: PerspectiveCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
  }, [])

  useFrame((_, delta) => {
    if (
      !tiltref.current ||
      !underref.current ||
      !cornerref.current ||
      !cameraref.current ||
      !depthoffield.current
    ) {
      return
    }

    // camera focus logic
    const { gadget } = useGadgetClient.getState()
    const control = layersreadcontrol(gadget.layers ?? [])
    const currentboard = gadget.board

    // tracking state
    const userdata = (cameraref.current.userData ??= {})
    initfocusifneeded(userdata, control, currentboard)

    damp3(
      cameraref.current.position,
      [0, 0, mapviewtoz(control.viewscale)],
      FOCUS_ANIM_RATE,
      delta,
    )

    dampE(
      tiltref.current.rotation,
      [mapviewtotilt(control.viewscale), 0, 0],
      FOCUS_ANIM_RATE,
      delta,
    )

    tiltref.current.updateMatrixWorld(true)

    cameraref.current.rotation.z = Math.PI
    cameraref.current.updateProjectionMatrix()
    cameraref.current.updateMatrixWorld(true)
    cornerref.current.updateWorldMatrix(true, false)

    const [tfocusx, tfocusy] = clampfocus(
      control.focusx,
      control.focusy,
      control.viewscale,
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
    )

    const boardtransition = stepfocuswithboardtransition(
      userdata,
      control,
      currentboard,
      tfocusx,
      tfocusy,
      delta,
    )

    const fx = (userdata.focusx + 0.5) * drawwidth
    const fy = (userdata.focusy + 0.5) * drawheight
    const targetcornerx = -fx
    const targetcornery = -fy

    // handle board transition
    if (boardtransition) {
      cornerref.current.position.set(targetcornerx, targetcornery, 0)
    }
    damp3(
      cornerref.current.position,
      [targetcornerx, targetcornery, 0],
      FOCUS_ANIM_RATE,
      delta,
    )

    // update dof (range/bokeh per zoom; focus distance tracks player in world space)
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

    const playerspritez = maxspriteslayerz(gadget.layers ?? [], 'mode7')

    cornerref.current.updateMatrixWorld(true)
    dofplayerworld.current.set(
      (control.focusx + 0.5) * drawwidth,
      (control.focusy + 0.5) * drawheight,
      playerspritez,
    )
    cornerref.current.localToWorld(dofplayerworld.current)
    cameraref.current.getWorldPosition(dofcamworld.current)
    depthoffield.current.cocMaterial.focusDistance =
      dofcamworld.current.distanceTo(dofplayerworld.current)

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

  // re-render when board or layer counts change (board change must trigger re-render)
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
  const exitpreviewgroups = buildexitpreviewgroups(
    gadget,
    layercachemap,
    drawwidth,
    drawheight,
  )

  const layersindex = under.length * 2 + 2
  return (
    <>
      <perspectiveCamera
        ref={bindboardcamera}
        near={0.1}
        far={2000}
        aspect={-viewwidth / viewheight}
      />
      <group position-z={layersindex}>
        {boardcamera && (
          <RenderLayer
            camera={boardcamera}
            viewwidth={viewwidth}
            viewheight={viewheight}
            effects={
              <>
                <DepthOfField ref={depthoffield} />
              </>
            }
          >
            <group position={[centerx, centery, -1000]}>
              <group ref={tiltref}>
                <group ref={cornerref}>
                  {layers.map((layer) => (
                    <Mode7Layer
                      key={layer.id}
                      id={layer.id}
                      from="layers"
                      z={maptolayerz(layer, 'mode7')}
                    />
                  ))}
                  {over.map((layer) => (
                    <Mode7Layer
                      key={layer.id}
                      id={layer.id}
                      from="over"
                      z={maptolayerz(layer, 'mode7') + drawheight * 1.75}
                      shadowheight={1.25}
                    />
                  ))}
                  {exitpreviewgroups.map(({ key, preview, position }) =>
                    preview.layers.length > 0 ? (
                      <group key={key} position={position}>
                        {preview.layers.map((layer) => (
                          <Mode7Layer
                            key={layer.id}
                            id={layer.id}
                            layers={preview.layers}
                            z={maptolayerz(layer, 'mode7')}
                          />
                        ))}
                      </group>
                    ) : null,
                  )}
                  <InspectorComponent z={0} />
                </group>
              </group>
            </group>
          </RenderLayer>
        )}
      </group>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} id={layer.id} from="under" z={i * 2} />
        ))}
      </group>
    </>
  )
})
