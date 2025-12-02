import { Instance, Instances } from '@react-three/drei'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER, LAYER_TYPE } from 'zss/gadget/data/types'
import { indextopt } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION, COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import {
  BlockMesh,
  BlockShadowMeshes,
  filterlayer2floor,
  filterlayer2walls,
  filterlayer2water,
} from './blocks'
import { Dither } from './dither'
import { Sprites } from './sprites'
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
            {/* <Instances ref={meshes} limit={BOARD_SIZE}>
              <BlockMesh />
              {layer.stats
                .map((collision, idx) => {
                  const pt = indextopt(idx, BOARD_WIDTH)
                  switch (collision as COLLISION) {
                    case COLLISION.ISSOLID:
                      return (
                        <Instance
                          key={idx}
                          position={[
                            (pt.x + 0.5) * drawwidth,
                            (pt.y + 0.5) * drawheight,
                            drawheight * 0.5,
                          ]}
                          color={[177, COLOR.DKGRAY, COLOR.BLACK]}
                        />
                      )
                  }
                  return null
                })
                .filter((el) => el)}
            </Instances> */}
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
      const rr = 8 / 14
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
          {/* <Instances ref={meshes} limit={BOARD_SIZE}>
            <ShadowMesh />
            {layer.sprites.map((sprite, idx) => (
              <Instance
                key={idx}
                scale={[1, rr, 1]}
                position={[
                  sprite.x * drawwidth,
                  (sprite.y + 0.25) * drawheight,
                  drawheight * -0.75 + 0.5,
                ]}
              />
            ))}
          </Instances> */}
          <BlockShadowMeshes sprites={othersprites} limit={BOARD_SIZE} />
          <Sprites
            sprites={[...othersprites]}
            scale={1.5}
            fliptexture={false}
          />
          <group position-z={drawheight * -0.5}>
            <Sprites
              sprites={[...watersprites]}
              scale={1.5}
              fliptexture={false}
            />
          </group>
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
