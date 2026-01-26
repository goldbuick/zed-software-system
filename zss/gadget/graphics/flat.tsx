/* eslint-disable react/no-unknown-property */
import { useFrame, useThree } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { useLayoutEffect, useRef, useState } from 'react'
import { Group, OrthographicCamera as OrthographicCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'

import { FlatLayer } from './flatlayer'
import { RenderLayer } from './renderlayer'

type GraphicsProps = {
  width: number
  height: number
}

export function FlatGraphics({ width, height }: GraphicsProps) {
  const { viewport } = useThree()
  const screensize = useScreenSize()

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const cameraref = useRef<OrthographicCameraImpl>(null)
  const cornerref = useRef<Group>(null)
  const zoomref = useRef<Group>(null)
  const inspectref = useRef<Group>(null)
  const inspectzoomref = useRef<Group>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => setcameraready(true), [])

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

    // edge clamping
    const viewscale = zoomref.current.scale.x
    const boarddrawwidth = BOARD_WIDTH * drawwidth
    const boarddrawheight = BOARD_HEIGHT * drawheight

    if (viewwidth > boarddrawwidth * viewscale) {
      userData.tfocusx = BOARD_WIDTH * 0.5
    } else {
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      const rightedge = BOARD_WIDTH - leftedge
      userData.tfocusx = clamp(control.focusx, leftedge - 1, rightedge + 0.25)
    }

    if (viewheight > boarddrawheight * viewscale) {
      userData.tfocusy = BOARD_HEIGHT * 0.5
    } else {
      const topedge = (viewheight * 0.5) / (drawheight * viewscale)
      const bottomedge = BOARD_HEIGHT - topedge
      userData.tfocusy = clamp(control.focusy, topedge - 1, bottomedge)
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

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)

  const {
    over = [],
    under = [],
    layers = [],
  } = useGadgetClient.getState().gadget

  const centerx = viewport.width * -0.5 + screensize.marginx
  const centery = viewport.height * 0.5 - screensize.marginy
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
        ref={cameraref}
        left={viewwidth * -0.5}
        right={viewwidth * 0.5}
        top={viewheight * -0.5}
        bottom={viewheight * 0.5}
        near={0.1}
        far={2000}
        position={[0, 0, 1000]}
        onUpdate={(c) => c.updateProjectionMatrix()}
      />
      {cameraref.current && (
        <RenderLayer
          camera={cameraref.current}
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
              </group>
            </group>
          </group>
        </RenderLayer>
      )}
    </>
  )
}
