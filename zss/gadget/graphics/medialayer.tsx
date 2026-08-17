import { useEffect } from 'react'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import {
  mediaqueueislistening,
  mediaqueuereadboundboardid,
  mediaqueuereadhelperpeerid,
} from 'zss/feature/mediaqueue/listenstate'
import {
  mediaqueueconnectifonboard,
  mediaqueuedisconnect,
} from 'zss/feature/mediaqueue/playerconnect'
import {
  mediaqueuelayerconnectaction,
  mediaqueuereadplayerlayerstate,
} from 'zss/feature/mediaqueue/playerlayerstate'
import { PALETTE } from 'zss/feature/palette'
import { createbitmapfromarray } from 'zss/gadget/data/bitmap'
import {
  CHARS_PER_ROW,
  CHARS_TOTAL_ROWS,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  FILE_BYTES_PER_COLOR,
  LAYER_TYPE,
  PALETTE_COLORS,
} from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useMedia } from 'zss/gadget/media'
import { isarray, isstring } from 'zss/mapping/types'

const defaultpalette = loadpalettefrombytes(PALETTE)
const defaultcharset = loadcharsetfrombytes(CHARSET)

/** Applies board MEDIA layers into useMedia (board/game only — not useGadgetMedia). */
export function MediaLayers() {
  const id = useGadgetClient((state) => state.gadget.id)
  const gadgetboard = useGadgetClient((state) => state.gadget.board ?? '')
  const helperpeerid = useGadgetClient((state) => {
    const layers = state.gadget.layers ?? []
    for (let i = 0; i < layers.length; ++i) {
      const layer = layers[i]
      if (
        layer.type === LAYER_TYPE.MEDIA &&
        layer.mime === 'text/mediaqueue-helper' &&
        isstring(layer.media)
      ) {
        return layer.media.trim()
      }
    }
    return ''
  })

  useEffect(() => {
    const layers = useGadgetClient.getState().gadget.layers ?? []
    let usepalette = defaultpalette
    let usecharset = defaultcharset
    let helperfromloop = ''
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
          case 'text/mediaqueue-helper':
            if (isstring(layer.media)) {
              helperfromloop = layer.media.trim()
            }
            break
        }
      }
      media.setpalette(usepalette)
      media.setcharset(usecharset)
    }
    if (!gadgetboard) {
      return
    }
    const activehelper = helperpeerid || helperfromloop
    const layer = mediaqueuereadplayerlayerstate()
    const action = mediaqueuelayerconnectaction({
      gadgetboard,
      activehelper,
      islistening: mediaqueueislistening(),
      boundboard: mediaqueuereadboundboardid(),
      boundhelper: mediaqueuereadhelperpeerid(),
      layerhelper: layer.helperpeerid,
      layerboard: layer.board,
    })
    switch (action.kind) {
      case 'connect':
        mediaqueueconnectifonboard(action.helperpeerid, gadgetboard)
        break
      case 'disconnect':
        mediaqueuedisconnect()
        break
      default:
        break
    }
  }, [id, gadgetboard, helperpeerid])

  return null
}
