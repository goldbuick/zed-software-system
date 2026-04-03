import { RUNTIME } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER, LAYER_TYPE, layersreadcontrol } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { BillboardMeshes } from './billboardmeshes'
import { splitlayer2fpvtiles } from './blocks'
import { DarknessMeshes } from './darknessmeshes'
import { PillarwMeshes } from './pillarmeshes'
import { ShadowMeshes } from './shadowmeshes'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from?: 'under' | 'over' | 'layers'
  layers?: LAYER[]
  multi?: boolean
}

export function FPVLayer({
  id,
  z,
  from,
  layers,
  multi = false,
}: GraphicsLayerProps) {
  const player = registerreadplayer()

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

  const control = layersreadcontrol(
    useGadgetClient.getState().gadget.layers ?? [],
  )

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      const { floor, walls, water, sky, flooredge, skyedge } =
        splitlayer2fpvtiles(layer.char, layer.color, layer.bg, layer.stats)
      return (
        <>
          <group key={layer.id} position={[0, 0, z]}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={floor.char}
              color={floor.color}
              bg={floor.bg}
              fpvinspectpick
            />
            <group position-z={drawheight * -0.25}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={water.char}
                color={water.color}
                bg={water.bg}
                fpvinspectpick
              />
            </group>
            {!multi && (
              <group position-z={drawheight * -0.25}>
                <PillarwMeshes
                  width={BOARD_WIDTH}
                  char={flooredge.char}
                  color={flooredge.color}
                  bg={flooredge.bg}
                  partial={0.25}
                  fpvinspectpick
                />
              </group>
            )}
            <group position-z={0.5}>
              <PillarwMeshes
                width={BOARD_WIDTH}
                char={walls.char}
                color={walls.color}
                bg={walls.bg}
                fpvinspectpick
              />
            </group>
            <group position-z={drawheight + 0.5}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={sky.char}
                color={sky.color}
                bg={sky.bg}
                fpvinspectpick
              />
            </group>
            {!multi && (
              <group position-z={drawheight + 0.5}>
                <PillarwMeshes
                  width={BOARD_WIDTH}
                  char={skyedge.char}
                  color={skyedge.color}
                  bg={skyedge.bg}
                  partial={0.5}
                  fpvinspectpick
                />
                <PillarwMeshes
                  width={BOARD_WIDTH}
                  char={walls.char}
                  color={walls.color}
                  bg={walls.bg}
                  fpvinspectpick
                />
              </group>
            )}
          </group>
        </>
      )
    }
    case LAYER_TYPE.SPRITES: {
      const rr = 8 / 14
      const othersprites: typeof layer.sprites = []
      const bulletsprites: typeof layer.sprites = []
      const watersprites: typeof layer.sprites = []
      const shadowsprites: typeof layer.sprites = []
      for (let i = 0; i < layer.sprites.length; ++i) {
        const sprite = layer.sprites[i]
        const stat = sprite.stat as COLLISION
        if (stat === COLLISION.ISBULLET) {
          bulletsprites.push(sprite)
        } else if (stat === COLLISION.ISSWIM) {
          watersprites.push(sprite)
        } else if (sprite.pid !== player) {
          othersprites.push(sprite)
        }
        if (
          stat !== COLLISION.ISSWIM &&
          stat !== COLLISION.ISGHOST &&
          sprite.pid !== player
        ) {
          shadowsprites.push(sprite)
        }
      }
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <BillboardMeshes
            sprites={othersprites}
            facing={control.facing}
            fpvinspectpick
          >
            {(ix, iy) => [
              (ix + 0.5) * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -0.5,
            ]}
          </BillboardMeshes>
          <BillboardMeshes
            sprites={bulletsprites}
            facing={control.facing}
            fpvinspectpick
          >
            {(ix, iy) => [
              (ix + 0.5) * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -0.75,
            ]}
          </BillboardMeshes>
          <BillboardMeshes
            sprites={watersprites}
            facing={control.facing}
            fpvinspectpick
          >
            {(ix, iy) => [
              (ix + 0.5) * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -1.25,
            ]}
          </BillboardMeshes>
          <ShadowMeshes sprites={shadowsprites} skipraycast>
            {(ix, iy) => [
              ix * drawwidth,
              (iy + 0.5 - rr * 0.5) * drawheight,
              drawheight * -0.5 + 0.5,
            ]}
          </ShadowMeshes>
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      return (
        <group key={layer.id} position={[0, 0, z]}>
          <DarknessMeshes alphas={layer.alphas} width={BOARD_WIDTH} />
        </group>
      )
    }
  }
}
