import { useEffect } from 'react'
import { usermediawritepeers } from 'zss/feature/usermedia'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  CHARS_PER_ROW,
  CHARS_TOTAL_ROWS,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  FILE_BYTES_PER_COLOR,
  LAYER_TYPE,
  PALETTE_COLORS,
} from 'zss/gadget/data/types'
import { isarray, isstring } from 'zss/mapping/types'
import { useShallow } from 'zustand/react/shallow'

import { createbitmapfromarray } from '../data/bitmap'
import { useMedia } from '../hooks'

type MediaLayerProps = {
  id: string
  from: 'under' | 'over' | 'layers'
}

export function MediaLayer({ id, from }: MediaLayerProps) {
  const media = useMedia()
  const layer = useGadgetClient(
    useShallow((state) => state.gadget[from]?.find((item) => item.id === id)),
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
      case 'text/mood':
        if (isstring(medialayer.media)) {
          media.setmood(medialayer.media)
        }
        break
      case 'text/players':
        if (isstring(medialayer.media)) {
          usermediawritepeers(medialayer.media.split(','))
        }
        break
    }
  }, [media, medialayer])

  return null
}
