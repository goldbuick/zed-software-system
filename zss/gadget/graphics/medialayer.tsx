import { useEffect } from 'react'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { BITMAP, createbitmapfromarray } from 'zss/gadget/data/bitmap'
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
import { useMedia } from 'zss/gadget/hooks'
import { MAYBE, isarray, isstring } from 'zss/mapping/types'

const defaultpalette = loadpalettefrombytes(PALETTE)
const defaultcharset = loadcharsetfrombytes(CHARSET)

export function MediaLayers() {
  const id = useGadgetClient((state) => state.gadget.id)
  useEffect(() => {
    const layers = useGadgetClient.getState().gadget.layers ?? []
    let usepalette = defaultpalette
    let usecharset = defaultcharset
    let usealtcharset: MAYBE<BITMAP>
    const media = useMedia.getState()
    for (let i = 0; layers && i < layers.length; ++i) {
      const layer = layers[i]
      if (layer.type === LAYER_TYPE.MEDIA) {
        switch (layer.mime) {
          case 'image/palette':
            if (isarray(layer.media)) {
              usepalette = createbitmapfromarray(
                FILE_BYTES_PER_COLOR,
                PALETTE_COLORS,
                layer.media,
              )
            }
            break
          case 'image/charset':
            if (isarray(layer.media)) {
              usecharset = createbitmapfromarray(
                CHARS_PER_ROW * CHAR_WIDTH,
                CHARS_TOTAL_ROWS * CHAR_HEIGHT,
                layer.media,
              )
            }
            break
          case 'image/altcharset':
            if (isarray(layer.media)) {
              usealtcharset = createbitmapfromarray(
                CHARS_PER_ROW * CHAR_WIDTH,
                CHARS_TOTAL_ROWS * CHAR_HEIGHT,
                layer.media,
              )
            }
            break
          case 'text/mood':
            if (isstring(layer.media)) {
              media.setmood(layer.media)
            }
            break
          case 'text/players':
            if (isstring(layer.media)) {
              //
            }
            break
        }
      }
      media.setpalette(usepalette)
      media.setcharset(usecharset)
      media.setaltcharset(usealtcharset)
    }
  }, [id])
  return null
}
