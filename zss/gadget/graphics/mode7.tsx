import { useFrame, useThree } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp3, dampE } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import type { FocusUserData } from 'zss/gadget/graphics/camerafocus'
import { dampfocus, initfocusifneeded } from 'zss/gadget/graphics/camerafocus'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { maptolayerz } from 'zss/gadget/graphics/layerz'
import { Mode7Layer } from 'zss/gadget/graphics/mode7layer'
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
      return -128
    default:
    case VIEWSCALE.MID:
      return 128
    case VIEWSCALE.FAR:
      return 512
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
  const depthoffield = useRef<DepthOfFieldEffect>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
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
    const fx = (ud.focusx! + 0.5) * drawwidth
    const fy = (ud.focusy! + 0.5) * drawheight

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
    damp3(cornerref.current.position, [-fx, -fy, 0], animrate, delta)

    // smoothed change in focus
    if (currentboard !== ud.currentboard) {
      ud.focusx = control.focusx
      ud.focusy = control.focusy
      ud.currentboard = currentboard
      cornerref.current.position.set(
        -((ud.focusx + 0.5) * drawwidth),
        -((ud.focusy + 0.5) * drawheight),
        0,
      )
    } else {
      dampfocus(userData, control, animrate)
    }

    // update dof
    switch (control.viewscale) {
      case VIEWSCALE.NEAR:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1200
        depthoffield.current.cocMaterial.worldFocusDistance = 350
        break
      default:
      case VIEWSCALE.MID:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1700
        depthoffield.current.cocMaterial.worldFocusDistance = 800
        break
      case VIEWSCALE.FAR:
        depthoffield.current.bokehScale = 10
        depthoffield.current.cocMaterial.worldFocusRange = 1700
        depthoffield.current.cocMaterial.worldFocusDistance = 1100
        break
    }

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
  useGadgetClient((state) => state.gadget.board)
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
        ref={cameraref}
        near={0.1}
        far={2000}
        aspect={-viewwidth / viewheight}
      />
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
