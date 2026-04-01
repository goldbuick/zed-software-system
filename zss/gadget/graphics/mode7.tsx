import { useFrame, useThree } from '@react-three/fiber'
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
import { useGadgetClient } from 'zss/gadget/data/state'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import type { FocusUserData } from 'zss/gadget/graphics/camerafocus'
import { initfocusifneeded } from 'zss/gadget/graphics/camerafocus'
import { flatcameratargetfocus } from 'zss/gadget/graphics/flatcamerabounds'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { isomode7focuspad } from 'zss/gadget/graphics/isomode7focuspad'
import { maptolayerz, maxspriteslayerz } from 'zss/gadget/graphics/layerz'
import { Mode7Layer } from 'zss/gadget/graphics/mode7layer'
import {
  MODE7_Z_FAR,
  MODE7_Z_MID,
  MODE7_Z_NEAR,
  mode7viewscalefromcameraz,
} from 'zss/gadget/graphics/mode7viewscale'
import { RenderLayer } from 'zss/gadget/graphics/renderlayer'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

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

export const Mode7Graphics = memo(function Mode7Graphics({
  width,
  height,
}: GraphicsProps) {
  const { viewport } = useThree()
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight

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
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    const animrate = 0.05
    const currentboard = useGadgetClient.getState().gadget.board

    const userData = cameraref.current.userData as FocusUserData
    initfocusifneeded(userData, control, currentboard)

    const ud = cameraref.current.userData ?? {}

    damp3(
      cameraref.current.position,
      [0, 0, mapviewtoz(control.viewscale)],
      animrate,
      delta,
    )

    dampE(
      tiltref.current.rotation,
      [mapviewtotilt(control.viewscale), 0, 0],
      animrate,
      delta,
    )

    const viewscale = mode7viewscalefromcameraz(cameraref.current.position.z)
    const { tfocusx, tfocusy } = flatcameratargetfocus({
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      viewscale,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: control.focusx,
      controlfocusy: control.focusy,
      ...isomode7focuspad(drawwidth, drawheight),
    })
    ud.tfocusx = tfocusx
    ud.tfocusy = tfocusy

    const fx = (ud.focusx! + 0.5) * drawwidth
    const fy = (ud.focusy! + 0.5) * drawheight

    damp3(cornerref.current.position, [-fx, -fy, 0], animrate, delta)

    if (currentboard !== ud.currentboard) {
      ud.focusx = tfocusx
      ud.focusy = tfocusy
      ud.currentboard = currentboard
      cornerref.current.position.set(
        -((ud.focusx + 0.5) * drawwidth),
        -((ud.focusy + 0.5) * drawheight),
        0,
      )
    } else {
      damp(userData, 'focusx', tfocusx, animrate)
      damp(userData, 'focusy', tfocusy, animrate)
    }

    // update dof (range/bokeh per zoom; focus distance tracks player in world space)
    switch (control.viewscale) {
      case VIEWSCALE.NEAR:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1200
        break
      default:
      case VIEWSCALE.MID:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1700
        break
      case VIEWSCALE.FAR:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1700
        break
    }

    const gadgetlayers = useGadgetClient.getState().gadget.layers ?? []
    const playerspritez = maxspriteslayerz(gadgetlayers, 'mode7')
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

    // center camera
    cameraref.current.rotation.z = Math.PI
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

  // re-render when board or layer counts change (board change must trigger re-render)
  // useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  const { gadget, layercachemap } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const exiteast = layercachemap.get(gadget.exiteast) ?? []
  const exitwest = layercachemap.get(gadget.exitwest) ?? []
  const exitnorth = layercachemap.get(gadget.exitnorth) ?? []
  const exitsouth = layercachemap.get(gadget.exitsouth) ?? []

  const layersindex = under.length * 2 + 2
  const centerx = viewport.width * -0.5 + screensize.marginx
  const centery = viewport.height * 0.5 - screensize.marginy
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
                    <FlatLayer
                      key={layer.id}
                      from="over"
                      id={layer.id}
                      z={maptolayerz(layer, 'mode7') + drawheight * 1.125}
                    />
                  ))}
                  {exiteast.length && (
                    <group position={[BOARD_WIDTH * drawwidth, 0, 0]}>
                      {exiteast.map((layer) => (
                        <Mode7Layer
                          key={layer.id}
                          id={layer.id}
                          layers={exiteast}
                          z={maptolayerz(layer, 'mode7')}
                        />
                      ))}
                    </group>
                  )}
                  {exitwest.length && (
                    <group position={[BOARD_WIDTH * -drawwidth, 0, 0]}>
                      {exitwest.map((layer) => (
                        <Mode7Layer
                          key={layer.id}
                          id={layer.id}
                          layers={exitwest}
                          z={maptolayerz(layer, 'mode7')}
                        />
                      ))}
                    </group>
                  )}
                  {exitnorth.length && (
                    <group position={[0, BOARD_HEIGHT * -drawheight, 0]}>
                      {exitnorth.map((layer) => (
                        <Mode7Layer
                          key={layer.id}
                          id={layer.id}
                          layers={exitnorth}
                          z={maptolayerz(layer, 'mode7')}
                        />
                      ))}
                    </group>
                  )}
                  {exitsouth.length && (
                    <group position={[0, BOARD_HEIGHT * drawheight, 0]}>
                      {exitsouth.map((layer) => (
                        <Mode7Layer
                          key={layer.id}
                          id={layer.id}
                          layers={exitsouth}
                          z={maptolayerz(layer, 'mode7')}
                        />
                      ))}
                    </group>
                  )}
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
})
