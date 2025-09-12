import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { degToRad } from 'maath/misc'
import { useLayoutEffect, useRef, useState } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER, LAYER_TYPE, layersreadcontrol } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { useScreenSize } from '../userscreen'

import { FlatLayer } from './flatlayer'
import { FPVLayer } from './fpvlayer'
import { MediaLayer } from './medialayer'
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
      return RUNTIME.DRAW_CHAR_HEIGHT() * 0.75
  }
  return 0
}

export function FPVGraphics({ width, height }: GraphicsProps) {
  const screensize = useScreenSize()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)

  const [, setcameraready] = useState(false)
  useLayoutEffect(() => {
    setcameraready(true)
  }, [])

  useFrame((state, delta) => {
    if (!overref.current || !underref.current || !cameraref.current) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // viewsize
    const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
    const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

    // drawsize
    const drawwidth = BOARD_WIDTH * RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = BOARD_HEIGHT * RUNTIME.DRAW_CHAR_HEIGHT()

    // setup tracking state
    if (!ispresent(cameraref.current.userData.focusx)) {
      cameraref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        facing: control.facing,
      }
    }

    // framing
    overref.current.position.x = 0
    overref.current.position.y = viewheight - drawheight

    const rscale = clamp(viewwidth / drawwidth, 1.0, 10.0)
    underref.current.position.x = viewwidth - drawwidth * rscale
    underref.current.position.y = 0
    underref.current.scale.setScalar(rscale)

    const animrate = 0.125
    // const { focusx, focusy, focuslx, focusly } = focusref.current.userData

    // --

    // bump focus by velocity
    // const deltax = control.focusx - focuslx
    // const deltay = control.focusy - focusly

    // pivot focus
    // const slead = 0.1
    // const xlead = mapviewtolead(control.viewscale) * slead
    // const uplead = mapviewtouplead(control.viewscale) * slead
    // const downlead = mapviewtodownlead(control.viewscale) * slead
    // if (deltay < 0) {
    //   focusref.current.userData.focusvx = 0
    //   focusref.current.userData.focusvy -= uplead
    // } else if (deltay > 0) {
    //   focusref.current.userData.focusvx = 0
    //   focusref.current.userData.focusvy += downlead
    // } else if (deltax < 0) {
    //   focusref.current.userData.focusvx -= xlead
    //   focusref.current.userData.focusvy = 0
    // } else if (deltax > 0) {
    //   focusref.current.userData.focusvx += xlead
    //   focusref.current.userData.focusvy = 0
    // }

    const drawcharwidth = RUNTIME.DRAW_CHAR_WIDTH()
    const drawcharheight = RUNTIME.DRAW_CHAR_HEIGHT()

    // smooth this
    // dampE(
    //   cameraref.current.rotation,
    //   [Math.PI * -0.5, control.facing, 0],
    //   animrate,
    //   delta,
    // )

    // snap this
    damp3(
      cameraref.current.position,
      [state.size.width * 0.5, state.size.height * 0.5, 1000],
      animrate,
      delta,
    )

    // cameraref.current.position.x = 0 //(control.focusx + 0.5) * drawcharwidth
    // cameraref.current.position.y = 0 //(control.focusy + 0.5) * drawcharheight
    // cameraref.current.position.z = 1000
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

  const layersindex = under.length * 2 + 2
  const overindex = layersindex + 2

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight

  const centerx = boarddrawwidth * -0.5 + screensize.marginx
  const centery = boarddrawheight * -0.5 + -screensize.marginy

  console.info(centerx)
  console.info(centery)

  return (
    <>
      {layers.map((layer) => (
        <MediaLayer key={`media${layer.id}`} id={layer.id} from="layers" />
      ))}
      <perspectiveCamera
        ref={cameraref}
        near={1}
        far={2000}
        aspect={-viewwidth / viewheight}
        // rotation={[Math.PI * -0.5, 0, 0]}
        // position={[100, 0, 1000]}
      />
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
                {/* <DepthOfField
                  target={[0, 0, 0]}
                  focalLength={0.2}
                  bokehScale={15}
                /> */}
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
                />
              ))}
            </group>
          </RenderLayer>
        )}
      </group>
      <group ref={overref} position-z={overindex}>
        {over.map((layer, i) => (
          <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
        ))}
      </group>
    </>
  )
}
