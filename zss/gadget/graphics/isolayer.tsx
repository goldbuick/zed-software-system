import { useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER, LAYER_TYPE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION, COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import {
  filterlayer2floor,
  filterlayer2flooredge,
  filterlayer2walls,
  filterlayer2water,
} from './blocks'
import { DarknessMeshes } from './darknessmeshes'
import { PillarwMeshes } from './pillarmeshes'
import { ShadowMeshes } from './shadowmeshes'
import { SpriteMeshes } from './spritemeshes'
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

  // memoize the per-type filter outputs so we do not rebuild four large
  // typed arrays + a derived walls cap on every parent commit when the
  // underlying layer reference is unchanged.
  const tilelayer = layer?.type === LAYER_TYPE.TILES ? layer : undefined
  const tilefilters = useMemo(() => {
    if (!tilelayer) {
      return undefined
    }
    const floor = filterlayer2floor(
      tilelayer.char,
      tilelayer.color,
      tilelayer.bg,
      tilelayer.stats,
    )
    const walls = filterlayer2walls(
      tilelayer.char,
      tilelayer.color,
      tilelayer.bg,
      tilelayer.stats,
    )
    const water = filterlayer2water(
      tilelayer.char,
      tilelayer.color,
      tilelayer.bg,
      tilelayer.stats,
    )
    const ground = filterlayer2flooredge(
      tilelayer.char,
      tilelayer.color,
      tilelayer.bg,
      tilelayer.stats,
    )
    const wallscap = {
      char: walls.char.map((c) => (c !== 0 ? 220 : 0)),
      color: walls.color.map((c) => (c !== 0 ? COLOR.BLACK : COLOR.ONCLEAR)),
      bg: walls.bg,
    }
    return { floor, walls, water, ground, wallscap }
  }, [tilelayer])

  const spritelayer = layer?.type === LAYER_TYPE.SPRITES ? layer : undefined
  const hideplayer = ispresent(layers)
  const spritefilters = useMemo(() => {
    if (!spritelayer) {
      return undefined
    }
    const othersprites = spritelayer.sprites.filter(
      (sprite) =>
        (sprite.stat as COLLISION) !== COLLISION.ISSWIM &&
        (!hideplayer || !sprite.pid),
    )
    const watersprites = spritelayer.sprites.filter(
      (sprite) =>
        (sprite.stat as COLLISION) === COLLISION.ISSWIM &&
        (!hideplayer || !sprite.pid),
    )
    const shadowsprites = othersprites.filter(
      (sprite) => (sprite.stat as COLLISION) !== COLLISION.ISGHOST,
    )
    return { othersprites, watersprites, shadowsprites }
  }, [spritelayer, hideplayer])

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      if (!tilefilters) {
        return null
      }
      const { floor, walls, water, ground, wallscap } = tilefilters
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
            {from !== 'over' && (
              <group position-z={drawheight * -1}>
                <PillarwMeshes
                  width={BOARD_WIDTH}
                  char={ground.char}
                  color={ground.color}
                  bg={ground.bg}
                />
              </group>
            )}
            <PillarwMeshes
              width={BOARD_WIDTH}
              char={wallscap.char}
              color={wallscap.color}
              bg={wallscap.bg}
            />
            <group position-z={drawheight}>
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
      if (!spritefilters) {
        return null
      }
      const { othersprites, watersprites, shadowsprites } = spritefilters
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <ShadowMeshes sprites={shadowsprites} limit={BOARD_SIZE}>
            {(ix, iy) => [
              ix * drawwidth,
              (iy + 0.25) * drawheight,
              drawheight * -0.75 + 0.5,
            ]}
          </ShadowMeshes>
          <SpriteMeshes sprites={othersprites} scale={1.25} />
          <group position-z={drawheight * -1}>
            <SpriteMeshes sprites={watersprites} scale={1.25} />
          </group>
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      // TODO replace this with the darkness meshes instances
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <DarknessMeshes alphas={layer.alphas} width={BOARD_WIDTH} />
        </group>
      )
    }
  }
}
