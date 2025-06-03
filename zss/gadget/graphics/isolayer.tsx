import { Instances } from '@react-three/drei'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { BOARD_SIZE } from 'zss/memory/types'
import { useShallow } from 'zustand/react/shallow'

import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from: 'under' | 'over' | 'layers'
}

export function IsoLayer({ id, z, from }: GraphicsLayerProps) {
  const layer = useGadgetClient(
    useShallow((state) => state.gadget[from]?.find((item) => item.id === id)),
  )

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
          </group>
          {/* <Instances limit={BOARD_SIZE}>
          </Instances> */}
        </>
      )
    }
    case LAYER_TYPE.SPRITES: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Sprites
            sprites={[...layer.sprites]}
            // withbillboards={true}
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
