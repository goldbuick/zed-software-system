import { CanvasTexture, Color } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { BITMAP, createspritebitmapfrombitmap } from 'zss/gadget/data/bitmap'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { palettetothreecolors } from 'zss/gadget/data/palettethree'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { createbitmaptexture } from 'zss/gadget/display/textures'
import { MAYBE, isequal, ispresent } from 'zss/mapping/types'
import { create } from 'zustand'

export type MEDIA_DATA = {
  palette?: BITMAP
  mood: string
  viewimage: string
  screen: Record<string, HTMLVideoElement>
  charset?: BITMAP
  palettedata?: Color[]
  charsetdata?: CanvasTexture
  spritecharset?: BITMAP
  spritecharsetdata?: CanvasTexture
  reset: () => void
  setmood: (mood: string) => void
  setviewimage: (viewimage: string) => void
  setpalette: (palette: MAYBE<BITMAP>) => void
  setcharset: (charset: MAYBE<BITMAP>) => void
  setscreen: (peer: string, screen: MAYBE<HTMLVideoElement>) => void
}

const palette = loadpalettefrombytes(PALETTE)
const charset = loadcharsetfrombytes(CHARSET)

export const useMedia = create<MEDIA_DATA>((set) => ({
  palette,
  charset,
  mood: '',
  viewimage: '',
  screen: {},
  reset() {
    const spritecharset = ispresent(charset)
      ? createspritebitmapfrombitmap(charset, CHAR_WIDTH, CHAR_HEIGHT)
      : undefined
    set({
      palette,
      mood: '',
      viewimage: '',
      screen: {},
      palettedata: palettetothreecolors(convertpalettetocolors(palette)),
      charset,
      charsetdata: createbitmaptexture(charset),
      spritecharset,
      spritecharsetdata: createbitmaptexture(spritecharset),
    })
  },
  setmood(mood) {
    set((state) => {
      if (isequal(state.mood, mood)) {
        return state
      }
      return { ...state, mood }
    })
  },
  setviewimage(viewimage) {
    set((state) => {
      if (isequal(state.viewimage, viewimage)) {
        return state
      }
      return { ...state, viewimage }
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
      const spritecharset = ispresent(charset)
        ? createspritebitmapfrombitmap(charset, CHAR_WIDTH, CHAR_HEIGHT)
        : undefined
      return {
        ...state,
        charset,
        charsetdata: createbitmaptexture(charset),
        spritecharset,
        spritecharsetdata: createbitmaptexture(spritecharset),
      }
    })
  },
  setscreen(peer, screen) {
    set((state) => {
      if (isequal(state.screen, screen)) {
        return state
      }
      return {
        ...state,
        screen: {
          ...state.screen,
          [peer]: screen,
        } as Record<string, HTMLVideoElement>,
      }
    })
  },
}))

useMedia.getState().reset()
