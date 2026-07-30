import { CanvasTexture, Color } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import type { BITMAP } from 'zss/gadget/data/bitmap'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { palettetothreecolors } from 'zss/gadget/data/palettethree'
import { createbitmaptexture } from 'zss/gadget/display/textures'
import { MAYBE, isequal } from 'zss/mapping/types'
import { create } from 'zustand'

/**
 * UI chrome charset/palette (tape, panel, ticker, etc.).
 * Independent of board `useMedia` — MediaLayers must not write here.
 * setpalette/setcharset are ready for future UI customization.
 */
export type TILES_MEDIA_SOURCE = 'board' | 'ui'

export type GADGET_MEDIA_DATA = {
  palette?: BITMAP
  charset?: BITMAP
  palettedata?: Color[]
  charsetdata?: CanvasTexture
  reset: () => void
  setpalette: (palette: MAYBE<BITMAP>) => void
  setcharset: (charset: MAYBE<BITMAP>) => void
}

const defaultpalettebitmap = loadpalettefrombytes(PALETTE)
const defaultcharsetbitmap = loadcharsetfrombytes(CHARSET)

export const useGadgetMedia = create<GADGET_MEDIA_DATA>((set) => ({
  palette: defaultpalettebitmap,
  charset: defaultcharsetbitmap,
  reset() {
    set({
      palette: defaultpalettebitmap,
      charset: defaultcharsetbitmap,
      palettedata: palettetothreecolors(
        convertpalettetocolors(defaultpalettebitmap),
      ),
      charsetdata: createbitmaptexture(defaultcharsetbitmap),
    })
  },
  setpalette(palette) {
    set((state) => {
      if (isequal(state.palette, palette)) {
        return state
      }
      return {
        ...state,
        palette,
        palettedata: palettetothreecolors(convertpalettetocolors(palette)),
      }
    })
  },
  setcharset(charset) {
    set((state) => {
      if (isequal(state.charset, charset)) {
        return state
      }
      return {
        ...state,
        charset,
        charsetdata: createbitmaptexture(charset),
      }
    })
  },
}))

useGadgetMedia.getState().reset()
