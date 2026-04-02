import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Group, OrthographicCamera as OrthographicCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { buildexitpreviewgroups } from 'zss/gadget/graphics/exitpreviewgroups'
import {
  flatcameradevassertboardinortho,
  flatcameratargetfocus,
} from 'zss/gadget/graphics/flatcamerabounds'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { maptolayerz } from 'zss/gadget/graphics/layerz'
import { useScreenSize } from 'zss/gadget/userscreen'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'

import { RenderLayer } from './renderlayer'

type GraphicsProps = {
  width: number
  height: number
}

export const FlatGraphics = memo(function FlatGraphics({
  width,
  height,
}: GraphicsProps) {
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const cameraref = useRef<OrthographicCameraImpl>(null)
  const [boardcamera, setboardcamera] = useState<OrthographicCameraImpl | null>(
    null,
  )
  const cornerref = useRef<Group>(null)
  const zoomref = useRef<Group>(null)
  const inspectref = useRef<Group>(null)
  const inspectzoomref = useRef<Group>(null)
  const centeroffsetref = useRef({ x: 0, y: 0 })
  const devassertframeref = useRef(0)

  const bindboardcamera = useCallback((c: OrthographicCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
  }, [])

  useFrame((_, delta) => {
    if (
      !cameraref.current ||
      !inspectref.current ||
      !zoomref.current ||
      !cornerref.current ||
      !inspectzoomref.current
    ) {
      return
    }

    const gadget = useGadgetClient.getState().gadget
    const control = layersreadcontrol(gadget.layers ?? [])
    const animrate = 0.05
    const currentboard = gadget.board

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      cameraref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        tfocusx: control.focusx,
        tfocusy: control.focusy,
        currentboard,
      }
      zoomref.current.scale.setScalar(control.viewscale)
    }

    const userData = cameraref.current.userData ?? {}
    const fx = (userData.focusx + 0.5) * drawwidth
    const fy = (userData.focusy + 0.5) * drawheight

    // zoom
    damp3(zoomref.current.scale, control.viewscale, animrate, delta)

    // pan
    damp3(cornerref.current.position, [-fx, -fy, 0], animrate, delta)

    const viewscale = zoomref.current.scale.x
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
    })
    userData.tfocusx = tfocusx
    userData.tfocusy = tfocusy

    if (import.meta.env.DEV) {
      devassertframeref.current += 1
      if (devassertframeref.current % 60 === 0) {
        const c = centeroffsetref.current
        const boardwscaled = BOARD_WIDTH * drawwidth * viewscale
        const boardhscaled = BOARD_HEIGHT * drawheight * viewscale
        flatcameradevassertboardinortho({
          centerx: c.x,
          centery: c.y,
          viewscale,
          cornerx: cornerref.current.position.x,
          cornery: cornerref.current.position.y,
          drawwidth,
          drawheight,
          boardwidth: BOARD_WIDTH,
          boardheight: BOARD_HEIGHT,
          viewwidth,
          viewheight,
          cellepsilon: Math.max(drawwidth, drawheight) * viewscale,
          checkhoriz: viewwidth <= boardwscaled,
          checkvert: viewheight <= boardhscaled,
        })
      }
    }

    // smoothed change in focus
    if (currentboard !== userData.currentboard) {
      userData.focusx = userData.tfocusx
      userData.focusy = userData.tfocusy
      userData.currentboard = currentboard
      cornerref.current.position.set(
        -((userData.focusx + 0.5) * drawwidth),
        -((userData.focusy + 0.5) * drawheight),
        0,
      )
    } else {
      damp(userData, 'focusx', userData.tfocusx, animrate)
      damp(userData, 'focusy', userData.tfocusy, animrate)
    }

    // keep inspector in place
    inspectref.current.position.x = cornerref.current.position.x
    inspectref.current.position.y = cornerref.current.position.y

    // keep inspector the same size
    inspectzoomref.current.scale.setScalar(viewscale)
  })

  // re-render when board or layer counts change (board change must trigger re-render)
  useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  useGadgetClient((state) => state.gadget.exiteast)
  useGadgetClient((state) => state.gadget.exitwest)
  useGadgetClient((state) => state.gadget.exitnorth)
  useGadgetClient((state) => state.gadget.exitsouth)
  useGadgetClient((state) => state.gadget.exitne)
  useGadgetClient((state) => state.gadget.exitnw)
  useGadgetClient((state) => state.gadget.exitse)
  useGadgetClient((state) => state.gadget.exitsw)

  const { gadget, layercachemap } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const exitpreviewgroups = buildexitpreviewgroups(
    gadget,
    layercachemap,
    drawwidth,
    drawheight,
  )

  // z of the topmost board layer (must stay in sync with FlatLayer z props below)
  const topoverz =
    over.length > 0
      ? 1 + under.length + layers.length + (over.length - 1) * 2
      : undefined
  const toplayersz =
    layers.length > 0 ? 1 + under.length + (layers.length - 1) * 2 : undefined
  const topunderz = under.length > 0 ? 1 + (under.length - 1) * 2 : undefined
  const maintopz = topoverz ?? toplayersz ?? topunderz ?? 1
  const exitzbase = maintopz + 2

  const fullgridwpx = screensize.cols * drawwidth
  const centerx = fullgridwpx * -0.5
  const centery = viewheight * 0.5
  useLayoutEffect(() => {
    centeroffsetref.current = { x: centerx, y: centery }
  }, [centerx, centery])

  return (
    <>
      <group position={[viewwidth * 0.5, viewheight * 0.5, 1]}>
        <group ref={inspectzoomref}>
          <group ref={inspectref}>
            <InspectorComponent />
          </group>
        </group>
      </group>
      <orthographicCamera
        ref={bindboardcamera}
        left={viewwidth * -0.5}
        right={viewwidth * 0.5}
        top={viewheight * -0.5}
        bottom={viewheight * 0.5}
        near={0.1}
        far={2000}
        position={[0, 0, 1000]}
        onUpdate={(c) => c.updateProjectionMatrix()}
      />
      {boardcamera && (
        <RenderLayer
          camera={boardcamera}
          viewwidth={viewwidth}
          viewheight={viewheight}
          effects={<></>}
        >
          <group position={[centerx, centery, 0]}>
            <group ref={zoomref}>
              <group ref={cornerref}>
                {under.map((layer, i) => (
                  <FlatLayer
                    key={layer.id}
                    from="under"
                    id={layer.id}
                    z={1 + i * 2}
                  />
                ))}
                {layers.map((layer, i) => (
                  <FlatLayer
                    key={layer.id}
                    from="layers"
                    id={layer.id}
                    z={1 + under.length + i * 2}
                  />
                ))}
                {over.map((layer, i) => (
                  <FlatLayer
                    key={layer.id}
                    from="over"
                    id={layer.id}
                    z={1 + under.length + layers.length + i * 2}
                  />
                ))}
                {exitpreviewgroups.map(({ key, preview, position }) =>
                  preview.layers.length > 0 ? (
                    <group key={key} position={position}>
                      {preview.layers.map((layer) => (
                        <FlatLayer
                          key={layer.id}
                          id={layer.id}
                          layers={preview.layers}
                          z={exitzbase + maptolayerz(layer, 'flat')}
                        />
                      ))}
                    </group>
                  ) : null,
                )}
              </group>
            </group>
          </group>
        </RenderLayer>
      )}
    </>
  )
})
