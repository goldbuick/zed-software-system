import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { useShallow } from 'zustand/react/shallow'

import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type Mode7LayerProps = {
  id: string
  z: number
  from: 'under' | 'over' | 'layers'
}

export function Mode7Layer({ id, z, from }: Mode7LayerProps) {
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
          <Sprites
            sprites={[...layer.sprites]}
            withbillboards={true}
            fliptexture={false}
          />
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      // generate border
      const border: number[] = new Array(
        (layer.width + 2) * (layer.height + 2),
      ).fill(0)
      for (let x = 1; x < BOARD_WIDTH - 1; ++x) {
        const x1 = layer.alphas[pttoindex({ x: 1 + x, y: 0 }, BOARD_WIDTH)]
        const x2 =
          layer.alphas[
            pttoindex({ x: 1 + x, y: BOARD_HEIGHT - 1 }, BOARD_WIDTH)
          ]
        border[pttoindex({ x: 1 + x, y: 0 }, BOARD_WIDTH + 2)] = x1
        border[pttoindex({ x: 1 + x, y: BOARD_HEIGHT }, BOARD_WIDTH + 2)] = x2
      }
      for (let y = 1; y < BOARD_HEIGHT - 1; ++y) {
        const y1 = layer.alphas[pttoindex({ x: 0, y: 1 + y }, BOARD_WIDTH)]
        const y2 =
          layer.alphas[pttoindex({ x: BOARD_WIDTH - 1, y: 1 + y }, BOARD_WIDTH)]
        border[pttoindex({ x: 0, y: 1 + y }, BOARD_WIDTH + 2)] = y1
        border[pttoindex({ x: BOARD_WIDTH, y: 1 + y }, BOARD_WIDTH + 2)] = y2
      }
      // border[0] =
      const gap = RUNTIME.DRAW_CHAR_HEIGHT()
      return (
        // eslint-disable-next-line react/no-unknown-property
        <>
          <group key={`under${layer.id}`} position={[0, 0, z]}>
            <Dither
              width={layer.width}
              height={layer.height}
              alphas={[...layer.alphas]}
            />
          </group>
          <group key={`mid${layer.id}`} position={[0, 0, z + gap]}>
            <Dither
              width={layer.width}
              height={layer.height}
              alphas={[...layer.alphas]}
            />
          </group>
          <group key={`over${layer.id}`} position={[0, 0, z + gap]}>
            <Dither
              width={layer.width + 2}
              height={layer.height + 2}
              alphas={border}
            />
          </group>
        </>
      )
    }
  }
}
