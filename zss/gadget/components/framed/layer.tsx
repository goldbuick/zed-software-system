import { useEqual, useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'

import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type FramedTilesProps = {
  id: string
  z: number
}

export function FramedLayer({ id, z }: FramedTilesProps) {
  const layer = useGadgetClient(
    useEqual((state) => state.gadget.layers.find((item) => item.id === id)),
  )
  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
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
          <Sprites sprites={[...layer.sprites]} />
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
