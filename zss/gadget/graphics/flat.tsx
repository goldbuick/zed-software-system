import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { useLayoutEffect, useRef, useState } from 'react'
import { Group, OrthographicCamera as OrthographicCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { TapeTerminalInspector } from 'zss/screens/inspector/component'

import { Rect } from '../rect'
import { useScreenSize } from '../userscreen'

import { FlatLayer } from './flatlayer'
import { RenderLayer } from './renderlayer'

type GraphicsProps = {
  width: number
  height: number
}

export function FlatGraphics({ width, height }: GraphicsProps) {
  const screensize = useScreenSize()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const cameraref = useRef<OrthographicCameraImpl>(null)
  const cornerref = useRef<Group>(null)
  const zoomref = useRef<Group>(null)
  const inspectref = useRef<Group>(null)
  const inspectscaleref = useRef<Group>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((state, delta) => {
    if (
      !cameraref.current ||
      !cornerref.current ||
      !zoomref.current ||
      !inspectref.current ||
      !inspectscaleref.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      cameraref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        tfocusx: control.focusx,
        tfocusy: control.focusy,
        facing: control.facing,
      }
      zoomref.current.scale.setScalar(control.viewscale)
    }

    const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
    const boarddrawwidth = BOARD_WIDTH * drawwidth
    const boarddrawheight = BOARD_HEIGHT * drawheight

    const animrate = 0.25
    damp3(zoomref.current.scale, control.viewscale, animrate, delta)

    const viewscale = zoomref.current.scale.x
    const focusx = cameraref.current.userData.focusx + 0.5
    const focusy = cameraref.current.userData.focusy + 0.5
    const fx = focusx * drawwidth * viewscale + boarddrawwidth * -0.5
    const fy = focusy * drawheight * viewscale + boarddrawheight * -0.5

    // pan
    damp3(cornerref.current.position, [-fx, -fy, 0], 0.05, delta)

    // center when margins
    if (viewwidth > boarddrawwidth * viewscale) {
      cameraref.current.userData.tfocusx = BOARD_WIDTH * 0.5
    } else {
      cameraref.current.userData.tfocusx = control.focusx
    }

    if (viewheight > boarddrawheight * viewscale) {
      cameraref.current.userData.tfocusy = BOARD_HEIGHT * 0.5
    } else {
      cameraref.current.userData.tfocusy = control.focusy
    }

    // smoothed change in focus
    damp(
      cameraref.current.userData,
      'focusx',
      cameraref.current.userData.tfocusx,
      animrate,
    )
    damp(
      cameraref.current.userData,
      'focusy',
      cameraref.current.userData.tfocusy,
      animrate,
    )

    // keep inspector in place
    inspectref.current.position.x =
      viewwidth * 0.5 - boarddrawwidth * 0.5 + cornerref.current.position.x
    inspectref.current.position.y =
      viewheight * 0.5 - boarddrawheight * 0.5 + cornerref.current.position.y

    // keep inspector the same size
    inspectscaleref.current.scale.setScalar(viewscale)

    // center camera
    cameraref.current.position.x = state.size.width * 0.5
    cameraref.current.position.y = state.size.height * 0.5
    cameraref.current.updateProjectionMatrix()
  })

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  const {
    over = [],
    under = [],
    layers = [],
  } = useGadgetClient.getState().gadget

  const nounderlayers = under.length === 0

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight
  const centerx = boarddrawwidth * -0.5 + screensize.marginx
  const centery = boarddrawheight * -0.5 - screensize.marginy

  return (
    <>
      <group ref={inspectref}>
        <group ref={inspectscaleref}>
          <TapeTerminalInspector />
        </group>
      </group>
      <orthographicCamera
        ref={cameraref}
        left={viewwidth * -0.5}
        right={viewwidth * 0.5}
        top={viewheight * -0.5}
        bottom={viewheight * 0.5}
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      {cameraref.current && (
        <RenderLayer
          camera={cameraref.current}
          viewwidth={viewwidth}
          viewheight={viewheight}
          effects={<></>}
        >
          <group position={[centerx, centery, 0]}>
            <group ref={cornerref}>
              <group ref={zoomref}>
                {nounderlayers && (
                  <Rect
                    color="black"
                    width={BOARD_WIDTH}
                    height={BOARD_HEIGHT}
                  />
                )}
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
              </group>
            </group>
          </group>
        </RenderLayer>
      )}
    </>
  )
}
