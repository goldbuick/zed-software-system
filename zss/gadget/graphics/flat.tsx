import { useFrame } from '@react-three/fiber'
import { damp3 } from 'maath/easing'
import { memo, useCallback, useRef, useState } from 'react'
import {
  Group,
  OrthographicCamera as OrthographicCameraImpl,
  Vector3,
} from 'three'
import { FLAT_CAMERA_ORTHO_ASSERT, RUNTIME } from 'zss/config'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { BOARD_INSPECTOR_Z_BUFFER } from 'zss/gadget/graphics/boardinspectorz'
import {
  FOCUS_ANIM_RATE,
  initfocusifneeded,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import { buildexitpreviewgroups } from 'zss/gadget/graphics/exitpreviewgroups'
import {
  flatcameradevassertboardinortho,
  flatcameratargetfocus,
} from 'zss/gadget/graphics/flatcamerabounds'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { maptolayerz } from 'zss/gadget/graphics/layerz'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'
import { useShallow } from 'zustand/react/shallow'

import { RenderLayer } from './renderlayer'

type GraphicsProps = {
  width: number
  height: number
}

export const FlatGraphics = memo(function FlatGraphics({
  width,
  height,
}: GraphicsProps) {
  const gpudprscale = useDeviceData((s) => s.gpudprscale)
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()
  const centerx = viewwidth * -0.5
  const centery = viewheight * -0.5

  const cameraref = useRef<OrthographicCameraImpl>(null)
  const [boardcamera, setboardcamera] = useState<OrthographicCameraImpl | null>(
    null,
  )
  const cornerref = useRef<Group>(null)
  const zoomref = useRef<Group>(null)
  const looktarget = useRef(new Vector3())

  const bindboardcamera = useCallback((c: OrthographicCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
  }, [])

  useFrame((_, delta) => {
    if (!cameraref.current || !zoomref.current || !cornerref.current) {
      return
    }

    const gadget = useGadgetClient.getState().gadget
    const control = layersreadcontrol(gadget.layers ?? [])
    const currentboard = gadget.board

    // tracking state
    const userdata = (cameraref.current.userData ??= {})
    if (initfocusifneeded(userdata, control, currentboard)) {
      zoomref.current.scale.setScalar(control.viewscale)
    }

    // zoom
    damp3(zoomref.current.scale, control.viewscale, FOCUS_ANIM_RATE, delta)

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

    // Focus cell center at portal origin: center + scale * (corner + local) = 0
    const targetcornerx = -centerx / viewscale - fx
    const targetcornery = -centery / viewscale - fy

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

    if (FLAT_CAMERA_ORTHO_ASSERT) {
      const boardwscaled = BOARD_WIDTH * drawwidth * viewscale
      const boardhscaled = BOARD_HEIGHT * drawheight * viewscale
      flatcameradevassertboardinortho({
        centerx,
        centery,
        viewscale,
        cornerx: cornerref.current.position.x,
        cornery: cornerref.current.position.y,
        drawwidth,
        drawheight,
        boardwidth: BOARD_WIDTH,
        boardheight: BOARD_HEIGHT,
        viewwidth,
        viewheight,
        cellepsilon: drawwidth * viewscale,
        checkhoriz: viewwidth <= boardwscaled,
        checkvert: viewheight <= boardhscaled,
      })
    }

    const cam = cameraref.current
    cam.up.set(0, 1, 0)
    looktarget.current.set(0, 0, 0)
    cam.position.set(0, 0, 1000)
    cam.lookAt(looktarget.current)
    cam.updateMatrixWorld()
  })

  // re-render on new gadget snapshot (reference); fine-grained hooks below narrow invalidation
  useGadgetClient((state) => state.gadget)
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

  let maxcornerz = maintopz
  for (const { preview } of exitpreviewgroups) {
    for (const layer of preview.layers) {
      maxcornerz = Math.max(maxcornerz, exitzbase + maptolayerz(layer, 'flat'))
    }
  }
  const inspectorz = maxcornerz + BOARD_INSPECTOR_Z_BUFFER
  return (
    <>
      <RenderLayer
        camera={boardcamera}
        viewwidth={viewwidth}
        viewheight={viewheight}
        dprscale={gpudprscale}
        effects={<></>}
      >
        <orthographicCamera
          ref={bindboardcamera}
          left={viewwidth * -0.5}
          right={viewwidth * 0.5}
          top={viewheight * 0.5}
          bottom={viewheight * -0.5}
          near={0.1}
          far={2000}
          position={[0, 0, 1000]}
          onUpdate={(c) => c.updateProjectionMatrix()}
        />
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
              <InspectorComponent z={inspectorz} />
            </group>
          </group>
        </group>
      </RenderLayer>
    </>
  )
})
