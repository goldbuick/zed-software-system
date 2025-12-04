import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { useShallow } from 'zustand/react/shallow'

import { Dither } from './dither'
import { SpriteMeshes } from './spritemeshes'
import { Tiles } from './tiles'

type FlatLayerProps = {
  id: string
  z: number
  from: 'under' | 'over' | 'layers'
}

export function FlatLayer({ id, z, from }: FlatLayerProps) {
  const layer = useGadgetClient(
    useShallow((state) => state.gadget[from]?.find((item) => item.id === id)),
  )

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Tiles
            width={layer.width}
            height={layer.height}
            char={[...layer.char]}
            color={[...layer.color]}
            bg={[...layer.bg]}
          />
        </group>
      )
    }
    case LAYER_TYPE.SPRITES: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <SpriteMeshes sprites={[...layer.sprites]} />
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
