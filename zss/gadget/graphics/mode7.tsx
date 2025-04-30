import {
  OrthographicCamera,
  PerspectiveCamera,
  RenderTexture,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { useRef } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import Clipping from '../clipping'

import { FlatLayer } from './flatlayer'

type FramedProps = {
  width: number
  height: number
}

export function Mode7Graphics({ width, height }: FramedProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const overref = useRef<Group>(null)
  const underref = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!overref.current || !underref.current) {
      return
    }

    // drawsize
    const drawwidth = BOARD_WIDTH * RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = BOARD_HEIGHT * RUNTIME.DRAW_CHAR_HEIGHT()

    // framing
    const cx = viewwidth * 0.5 - drawwidth * 0.5
    const cy = viewheight * 0.5 - drawheight * 0.5
    overref.current.position.x = cx
    overref.current.position.y = cy
    underref.current.position.x = cx
    underref.current.position.y = cy
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
  console.info({ layersindex, overindex })

  // handle graphics modes
  const control = layersreadcontrol(layers)

  return (
    <>
      <Clipping width={viewwidth} height={viewheight}>
        <group ref={underref}>
          {under.map((layer, i) => (
            <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
          ))}
        </group>
        <mesh position={[viewwidth, 0, 0]}>
          <planeGeometry args={[viewwidth, viewheight]} />
          <meshBasicMaterial>
            <RenderTexture
              attach="map"
              width={viewwidth}
              height={viewheight}
              depthBuffer={false}
              stencilBuffer={false}
              generateMipmaps={false}
            >
              <PerspectiveCamera
                makeDefault
                near={1}
                far={2000}
                position={[0, 0, 1000]}
              />
              <group position={[viewwidth * -0.5, viewheight * -0.5, 0]}>
                {layers.map((layer, i) => (
                  <FlatLayer
                    key={layer.id}
                    id={layer.id}
                    from="layers"
                    z={1 + i * 2}
                  />
                ))}
              </group>
            </RenderTexture>
          </meshBasicMaterial>
        </mesh>
        <group ref={overref} position-z={overindex}>
          {over.map((layer, i) => (
            <FlatLayer key={layer.id} from="over" id={layer.id} z={i * 2} />
          ))}
        </group>
      </Clipping>
    </>
  )
}
