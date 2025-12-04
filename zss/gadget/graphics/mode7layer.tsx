import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER, LAYER_TYPE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import {
  filterlayer2floor,
  filterlayer2walls,
  filterlayer2water,
} from './blocks'
import { DarknessMeshes } from './darknessmeshes'
import { ShadowMeshes } from './shadowmeshes'
import { SpriteMeshes } from './spritemeshes'
import { Tiles } from './tiles'

type Mode7LayerProps = {
  id: string
  z: number
  from?: 'under' | 'over' | 'layers'
  layers?: LAYER[]
}

export function Mode7Layer({ id, z, from, layers }: Mode7LayerProps) {
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

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      const floor = filterlayer2floor(
        layer.char,
        layer.color,
        layer.bg,
        layer.stats,
      )
      const walls = filterlayer2walls(
        layer.char,
        layer.color,
        layer.bg,
        layer.stats,
      )
      const water = filterlayer2water(
        layer.char,
        layer.color,
        layer.bg,
        layer.stats,
      )
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Tiles
            width={layer.width}
            height={layer.height}
            char={floor.char}
            color={floor.color}
            bg={floor.bg}
          />
          <group position-z={drawheight * -0.25}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={water.char}
              color={water.color}
              bg={water.bg}
            />
          </group>
          <group position-z={drawheight * 0.25}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={walls.char}
              color={walls.color}
              bg={walls.bg}
            />
          </group>
        </group>
      )
    }
    case LAYER_TYPE.SPRITES: {
      const hideplayer = ispresent(layers)
      const othersprites = layer.sprites.filter(
        (sprite) =>
          (sprite.stat as COLLISION) !== COLLISION.ISSWIM &&
          (!hideplayer || !sprite.pid),
      )
      const watersprites = layer.sprites.filter(
        (sprite) =>
          (sprite.stat as COLLISION) === COLLISION.ISSWIM &&
          (!hideplayer || !sprite.pid),
      )
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <ShadowMeshes sprites={othersprites} limit={BOARD_SIZE}>
            {(ix, iy) => [
              ix * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -0.5 + 0.5,
            ]}
          </ShadowMeshes>
          <SpriteMeshes sprites={othersprites} withbillboards={true} />
          <group position-z={drawheight * -0.5}>
            <SpriteMeshes sprites={watersprites} withbillboards={true} />
          </group>
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      return (
        <group position={[0, 0, z + 1]}>
          <DarknessMeshes alphas={layer.alphas} width={BOARD_WIDTH} />
        </group>
      )
    }
  }
}
