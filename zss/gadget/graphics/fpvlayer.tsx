import { Instance, Instances } from '@react-three/drei'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { indextopt } from 'zss/mapping/2d'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { useShallow } from 'zustand/react/shallow'

import { BlockMesh } from './blocks'
import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from: 'under' | 'over' | 'layers'
}

export function FPVLayer({ id, z, from }: GraphicsLayerProps) {
  const layer = useGadgetClient(
    useShallow((state) => state.gadget[from]?.find((item) => item.id === id)),
  )

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      // filter tiles
      return (
        <>
          <group key={layer.id} position={[0, 0, z]}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={[...layer.char]}
              color={[...layer.color]}
              bg={[...layer.bg]}
            />
            <Instances limit={BOARD_SIZE}>
              <BlockMesh />
              {layer.wall
                .map((iswall, idx) => {
                  const pt = indextopt(idx, BOARD_WIDTH)
                  if (iswall) {
                    return (
                      <Instance
                        key={idx}
                        position={[
                          (pt.x + 0.5) * drawwidth,
                          (pt.y + 0.5) * drawheight,
                          z + drawheight * 0.5,
                        ]}
                        color={[
                          layer.char[idx],
                          layer.color[idx],
                          layer.bg[idx],
                        ]}
                      />
                    )
                  }
                  return null
                })
                .filter((el) => el)}
            </Instances>
          </group>
        </>
      )
    }
    case LAYER_TYPE.SPRITES: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Sprites
            sprites={[...layer.sprites]}
            withbillboards={true}
            fliptexture={false}
          />
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Dither
            width={layer.width}
            height={layer.height}
            alphas={[...layer.alphas]}
          />
        </group>
      )
    }
  }
}
