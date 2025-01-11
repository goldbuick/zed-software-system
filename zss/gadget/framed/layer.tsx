import { useEffect } from 'react'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  CHAR_HEIGHT,
  CHAR_WIDTH,
  CHARS_PER_ROW,
  CHARS_TOTAL_ROWS,
  LAYER_TYPE,
  PALETTE_COLORS,
} from 'zss/gadget/data/types'
import { isarray } from 'zss/mapping/types'
import { useShallow } from 'zustand/react/shallow'

import { createbitmapfromarray } from '../data/bitmap'
import { FILE_BYTES_PER_COLOR } from '../file/bytes'
import { useMedia } from '../hooks'

import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type FramedTilesProps = {
  id: string
  z: number
}

export function FramedLayer({ id, z }: FramedTilesProps) {
  const media = useMedia()
  const layer = useGadgetClient(
    useShallow((state) => state.gadget.layers.find((item) => item.id === id)),
  )

  // special case for media elements
  const medialayer = layer?.type === LAYER_TYPE.MEDIA ? layer : undefined
  useEffect(() => {
    switch (medialayer?.mime) {
      case 'image/palette':
        if (isarray(medialayer.media)) {
          media.setpalette(
            createbitmapfromarray(
              FILE_BYTES_PER_COLOR,
              PALETTE_COLORS,
              medialayer.media,
            ),
          )
        }
        break
      case 'image/charset':
        if (isarray(medialayer.media)) {
          media.setcharset(
            createbitmapfromarray(
              CHARS_PER_ROW * CHAR_WIDTH,
              CHARS_TOTAL_ROWS * CHAR_HEIGHT,
              medialayer.media,
            ),
          )
        }
        break
      case 'image/altcharset':
        if (isarray(medialayer.media)) {
          media.setaltcharset(
            createbitmapfromarray(
              CHARS_PER_ROW * CHAR_WIDTH,
              CHARS_TOTAL_ROWS * CHAR_HEIGHT,
              medialayer.media,
            ),
          )
        }
        break
    }
  }, [media, medialayer])

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
