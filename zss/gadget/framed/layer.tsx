import { useEffect, useState } from 'react'
import { useGadgetClient } from 'zss/gadget/data/state'
import { CHAR_HEIGHT, CHAR_WIDTH, LAYER_TYPE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { useShallow } from 'zustand/react/shallow'

import { createbitmapfromarray } from '../data/bitmap'
import { convertPaletteToColors } from '../data/palette'
import { createbitmaptexture } from '../display/textures'
import { useMediaContext } from '../hooks'

import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type FramedTilesProps = {
  id: string
  z: number
}

export function FramedLayer({ id, z }: FramedTilesProps) {
  const media = useMediaContext()
  const layer = useGadgetClient(
    useShallow((state) => state.gadget.layers.find((item) => item.id === id)),
  )

  // special case for media elements
  const [content, updatecontent] = useState<Uint8Array>()
  const medialayer = layer?.type === LAYER_TYPE.MEDIA ? layer : undefined
  useEffect(() => {
    switch (medialayer?.mime) {
      case 'image/palette':
        if (
          medialayer.media instanceof Uint8Array &&
          medialayer.media !== content
        ) {
          updatecontent(medialayer.media)
          const data = createbitmapfromarray(3, 16, medialayer.media)
          media.setpalette(convertPaletteToColors(data))
        }
        break
      case 'image/charset':
        if (
          medialayer.media instanceof Uint8Array &&
          medialayer.media !== content
        ) {
          updatecontent(medialayer.media)
          const data = createbitmapfromarray(
            16 * CHAR_WIDTH,
            16 * CHAR_HEIGHT,
            medialayer.media,
          )
          const charset = createbitmaptexture(data)
          if (ispresent(charset)) {
            media.setcharset(charset)
          }
        }
        break
      case 'image/altcharset':
        if (
          medialayer.media instanceof Uint8Array &&
          medialayer.media !== content
        ) {
          updatecontent(medialayer.media)
          const data = createbitmapfromarray(
            16 * CHAR_WIDTH,
            16 * CHAR_HEIGHT,
            medialayer.media,
          )
          const altcharset = createbitmaptexture(data)
          if (ispresent(altcharset)) {
            media.setaltcharset(altcharset)
          }
        }
        break
    }
  }, [media, content, medialayer])

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
