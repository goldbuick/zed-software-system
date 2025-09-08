import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { degToRad } from 'maath/misc'
import { useRef } from 'react'
import { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  LAYER,
  LAYER_TYPE,
  VIEWSCALE,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

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
      return RUNTIME.DRAW_CHAR_HEIGHT() * 0.25
  }
  return 0
}

function maptoscale(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 10
    default:
    case VIEWSCALE.MID:
      return 4
    case VIEWSCALE.FAR:
      return 1.5
  }
}

export function FPVGraphics({ width, height }: GraphicsProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)

  useFrame((_, delta) => {
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
    // if (!ispresent(cameraref.current.userData.focusx)) {
    //   cameraref.current.userData = {
    //     focusx: control.focusx,
    //     focusy: control.focusy,
    //     focuslx: control.focusx,
    //     focusly: control.focusy,
    //     focusvx: 0,
    //     focusvy: 0,
    //     facing: control.facing,
    //     focusz: 0,
    //   }
    // }

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
    dampE(
      cameraref.current.rotation,
      [Math.PI * -0.5, control.facing, 0],
      animrate,
      delta,
    )

    // snap this
    cameraref.current.position.x = (control.focusx + 0.5) * drawcharwidth
    cameraref.current.position.y = (control.focusy + 0.5) * drawcharheight
    cameraref.current.position.z = RUNTIME.DRAW_CHAR_HEIGHT() * 0.75
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
  return (
    <>
      <group position-z={layersindex}>
        {layers.map((layer) => (
          <MediaLayer key={`media${layer.id}`} id={layer.id} from="layers" />
        ))}
        <RenderLayer
          mode="fpv"
          viewwidth={viewwidth}
          viewheight={viewheight}
          effects={
            <>
              <DepthOfField
                target={[0, 0, 0]}
                focalLength={0.2}
                bokehScale={15}
              />
            </>
          }
        >
          <PerspectiveCamera
            ref={cameraref}
            manual
            makeDefault
            near={1}
            far={2000}
            rotation={[Math.PI * -0.5, 0, 0]}
            position={[0, 0, 200]}
          />
          {layers.map((layer) => (
            <FPVLayer
              key={layer.id}
              id={layer.id}
              from="layers"
              z={maptolayerz(layer)}
            />
          ))}
        </RenderLayer>
      </group>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
      <group ref={overref} position-z={overindex}>
        {over.map((layer, i) => (
          <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
        ))}
      </group>
    </>
  )
}
