import { Hud, OrthographicCamera } from '@react-three/drei'
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
import { FramedLayer } from '../framedlayer/component'
import { TapeTerminalInspector } from '../inspector/component'

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
    overref.current.position.set(cx, cy, 0)
    underref.current.position.set(cx, cy, 0)
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

  // handle graphics modes
  const control = layersreadcontrol(layers)

  // TODO, scale to fill for over / under boards

  /*
                    <mesh>
                      <planeGeometry args={[mediawidth, mediawidth / r]} />
                      <meshBasicMaterial side={DoubleSide}>
                        <videoTexture attach="map" args={[video]} />
                      </meshBasicMaterial>
                    </mesh>
  */

  return (
    <>
      <Clipping width={viewwidth} height={viewheight}>
        <group ref={underref}>
          {under.map((layer, i) => (
            <FramedLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
          ))}
        </group>
      </Clipping>
      {/* <Clipping width={viewwidth} height={viewheight}>
        {layers.map((layer, i) => (
          <FramedLayer key={layer.id} id={layer.id} z={under.length + i * 2} />
        ))}
      </Clipping> */}
      <Clipping width={viewwidth} height={viewheight}>
        <group ref={overref}>
          {over.map((layer, i) => (
            <FramedLayer
              key={layer.id}
              from="over"
              id={layer.id}
              z={under.length + layers.length + i * 2}
            />
          ))}
        </group>
      </Clipping>
    </>
  )
}
