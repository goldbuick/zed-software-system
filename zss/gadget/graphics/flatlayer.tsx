import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { LAYER, LAYER_TYPE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { useShallow } from 'zustand/react/shallow'

import { Dither } from './dither'
import { SpriteMeshes } from './spritemeshes'
import { Tiles } from './tiles'

type FlatLayerProps = {
  id: string
  z: number
  from?: 'under' | 'over' | 'layers'
  layers?: LAYER[]
}

export function FlatLayer({ id, z, from, layers }: FlatLayerProps) {
  const layer = useGadgetClient(
    useShallow((state) => {
      if (ispresent(from)) {
        return state.gadget[from]?.find((item) => item.id === id)
      }
      if (ispresent(layers)) {
        return layers.find((item) => item.id === id)
      }
      return undefined
    }),
  )

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <Tiles
            width={layer.width}
            height={layer.height}
            char={layer.char}
            color={layer.color}
            bg={layer.bg}
          />
        </group>
      )
    }
    case LAYER_TYPE.SPRITES: {
      const hideplayer = ispresent(layers)
      const othersprites = layer.sprites.filter(
        (sprite) => !hideplayer || !sprite.pid,
      )
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <SpriteMeshes sprites={othersprites} />
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <Dither
            width={layer.width}
            height={layer.height}
            alphas={layer.alphas}
          />
        </group>
      )
    }
  }
}
