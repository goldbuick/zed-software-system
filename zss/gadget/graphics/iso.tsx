/* eslint-disable react/no-unknown-property */
import { useFrame, useThree } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp3 } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { Group, OrthographicCamera as OrthographicCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import type { FocusUserData } from 'zss/gadget/graphics/camerafocus'
import { dampfocus, initfocusifneeded } from 'zss/gadget/graphics/camerafocus'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { IsoLayer } from 'zss/gadget/graphics/isolayer'
import { maptolayerz } from 'zss/gadget/graphics/layerz'
import { RenderLayer } from 'zss/gadget/graphics/renderlayer'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

type GraphicsProps = {
  width: number
  height: number
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

export const IsoGraphics = memo(function IsoGraphics({
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

    const userData = cameraref.current.userData as FocusUserData
    const didinit = initfocusifneeded(userData, control, currentboard, {
      withfacing: true,
    })
    if (didinit) {
      zoomref.current.scale.setScalar(control.viewscale)
    }

    const ud = cameraref.current.userData ?? {}
    const fx = (ud.focusx! + 0.5) * drawwidth
    const fy = (ud.focusy! + 0.5) * drawheight

    // zoom
    damp3(zoomref.current.scale, maptoscale(control.viewscale), animrate, delta)

    // pan
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

  // re-render when board or layer counts change (board change must trigger re-render)
  useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  const { gadget, layercache } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const exiteast = layercache[gadget.exiteast] ?? []
  const exitwest = layercache[gadget.exitwest] ?? []
  const exitnorth = layercache[gadget.exitnorth] ?? []
  const exitsouth = layercache[gadget.exitsouth] ?? []

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
                        z={maptolayerz(layer, 'iso')}
                      />
                    ))}
                    {over.map((layer) => (
                      <IsoLayer
                        key={layer.id}
                        from="over"
                        id={layer.id}
                        z={maptolayerz(layer, 'iso') + drawheight + 1}
                      />
                    ))}
                    {exiteast.length && (
                      <group position={[BOARD_WIDTH * drawwidth, 0, 0]}>
                        {exiteast.map((layer) => (
                          <IsoLayer
                            key={layer.id}
                            id={layer.id}
                            layers={exiteast}
                            z={maptolayerz(layer, 'iso')}
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
                            z={maptolayerz(layer, 'iso')}
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
                            z={maptolayerz(layer, 'iso')}
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
                            z={maptolayerz(layer, 'iso')}
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
})
