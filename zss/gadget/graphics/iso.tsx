import { OrthographicCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { useRef } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  LAYER,
  LAYER_TYPE,
  VIEWSCALE,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { FlatLayer } from './flatlayer'
import { IsoLayer } from './isolayer'
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

export function IsoGraphics({ width, height }: GraphicsProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const zoomref = useRef<Group>(null)
  const tiltref = useRef<Group>(null)
  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const focusref = useRef<Group>(null)

  useFrame((_, delta) => {
    if (
      !zoomref.current ||
      !tiltref.current ||
      !overref.current ||
      !underref.current ||
      !focusref.current
    ) {
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
    if (!ispresent(focusref.current.userData.focusx)) {
      zoomref.current.scale.setScalar(control.viewscale)
      focusref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        focuslx: control.focusx,
        focusly: control.focusy,
        focusvx: 0,
        focusvy: 0,
        facing: control.facing,
        focusz: 0,
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
    const { focusx, focusy, focuslx, focusly } = focusref.current.userData

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

    // calc focus
    let fx = focusx + 0.25
    let fy = focusy + 0.5
    fx += focusref.current.userData.focusvx
    fy += focusref.current.userData.focusvy
    fx *= -RUNTIME.DRAW_CHAR_WIDTH()
    fy *= -RUNTIME.DRAW_CHAR_HEIGHT()

    // update tracking
    focusref.current.userData.focuslx = control.focusx
    focusref.current.userData.focusly = control.focusy

    // zoom
    damp3(zoomref.current.scale, maptoscale(control.viewscale), animrate, delta)

    // tilt
    dampE(tiltref.current.rotation, [0, 0, 0], animrate, delta)

    // focus
    damp3(focusref.current.position, [fx, fy, 0], animrate, delta)

    // smoothed change in focus
    damp(focusref.current.userData, 'focusx', control.focusx, animrate)
    damp(focusref.current.userData, 'focusy', control.focusy, animrate)
    damp(focusref.current.userData, 'focusvx', 0, animrate * 5)
    damp(focusref.current.userData, 'focusvy', 0, animrate * 5)

    // facing
    tiltref.current.rotation.z = control.facing
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
          <OrthographicCamera
            manual
            makeDefault
            near={1}
            far={2000}
            position={[0, 0, 1000]}
          />
          <group rotation={[Math.PI * 0.25, 0, Math.PI * -0.25]}>
            <group ref={zoomref}>
              <group ref={tiltref}>
                <group ref={focusref}>
                  {layers.map((layer) => (
                    <IsoLayer
                      key={layer.id}
                      id={layer.id}
                      from="layers"
                      z={maptolayerz(layer)}
                    />
                  ))}
                </group>
              </group>
            </group>
          </group>
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
