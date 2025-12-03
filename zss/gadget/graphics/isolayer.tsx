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
import { Dither } from './dither'
import { PillarwMeshes } from './pillarmeshes'
import { ShadowMeshes } from './shadowmeshes'
import { Sprites } from './spritemeshes'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from?: 'under' | 'over' | 'layers'
  layers?: LAYER[]
}

export function IsoLayer({ id, z, from, layers }: GraphicsLayerProps) {
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
        <>
          <group key={layer.id} position={[0, 0, z]}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={floor.char}
              color={floor.color}
              bg={floor.bg}
            />
            <group position-z={drawheight * -0.5}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={water.char}
                color={water.color}
                bg={water.bg}
              />
            </group>
            <PillarwMeshes
              width={BOARD_WIDTH}
              char={walls.char.map((c) => (c !== 0 ? 219 : 0))}
              color={walls.color}
              bg={walls.bg}
            />
            <group position-z={drawheight + 1}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={walls.char}
                color={walls.color}
                bg={walls.bg}
              />
            </group>
          </group>
        </>
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
              (iy + 0.25) * drawheight,
              drawheight * -0.75 + 0.5,
            ]}
          </ShadowMeshes>
          <Sprites sprites={[...othersprites]} scale={1.5} />
          <group position-z={drawheight * -0.5}>
            <Sprites sprites={[...watersprites]} scale={1.5} />
          </group>
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      // TODO replace this with the darkness meshes instances
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
