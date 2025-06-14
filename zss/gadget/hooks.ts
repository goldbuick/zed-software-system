import { createXRStore } from '@react-three/xr'
import { createContext, useContext, useState } from 'react'
import { CanvasTexture, Color } from 'three'
import { objectKeys } from 'ts-extras'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { TILES } from 'zss/gadget/data/types'
import { isequal, ispresent, MAYBE } from 'zss/mapping/types'
import { createwritetextcontext } from 'zss/words/textformat'
import { create, createStore, StoreApi } from 'zustand'

import { BITMAP } from './data/bitmap'
import { convertpalettetocolors } from './data/palette'
import { createbitmaptexture } from './display/textures'

export const xrstore = createXRStore()

export const WriteTextContext = createContext(
  createwritetextcontext(1, 1, 15, 1),
)

export function useWriteText() {
  return useContext(WriteTextContext)
}

const useToggle = create<{ blink: boolean }>(() => ({ blink: false }))

setInterval(() => {
  useToggle.setState((state) => ({ blink: !state.blink }))
}, 333)

export function useBlink() {
  return useToggle((state) => state.blink)
}

export type DITHER_DATA = {
  dither: number[]
  render: number
  changed: () => void
}

function createditherstore() {
  return createStore<DITHER_DATA>((set) => {
    function changed() {
      set((state) => ({ render: state.render + 1 }))
    }
    return {
      dither: [],
      render: 0,
      changed() {
        queueMicrotask(changed)
      },
    }
  })
}

export function resetDither(dither: number[]) {
  dither.fill(0)
}

export function writeDither(
  dither: number[],
  width: number,
  height: number,
  x: number,
  y: number,
  value: number,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return -1
  }
  dither[x + y * width] = value
}

export const DitherContext = createContext(createditherstore())

export function useDither(
  width: number,
  height: number,
  dither: number,
): StoreApi<DITHER_DATA> {
  const [store] = useState(() => createditherstore())

  // ensure array sizes are correct
  const size = width * height
  const state = store.getState()
  if (state.dither.length !== size) {
    state.dither = new Array(size).fill(dither)
    state.render = 0
  }

  return store
}

export type TILE_DATA = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
  render: number
  changed: () => void
}

function createtilesstore() {
  return createStore<TILE_DATA>((set) => {
    function changed() {
      set((state) => ({ render: state.render + 1 }))
    }
    return {
      width: 0,
      height: 0,
      char: [],
      color: [],
      bg: [],
      render: 0,
      changed() {
        queueMicrotask(changed)
      },
    }
  })
}

export function resetTiles(
  tiles: TILES,
  char: number,
  color: number,
  bg: number,
) {
  tiles.char.fill(char)
  tiles.color.fill(color)
  tiles.bg.fill(bg)
}

type WRITE_TILE_VALUE = {
  char: number
  color: number
  bg: number
}

export function writeTile(
  tiles: TILES,
  width: number,
  height: number,
  x: number,
  y: number,
  value: Partial<WRITE_TILE_VALUE>,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return
  }

  const index = x + y * width
  objectKeys(value).forEach((key) => {
    const v = value[key]
    if (ispresent(v)) {
      tiles[key][index] = v
    }
  })
}

export const TilesContext = createContext(createtilesstore())

export function useTiles(
  width: number,
  height: number,
  char: number,
  color: number,
  bg: number,
): StoreApi<TILE_DATA> {
  const [store] = useState(() => createtilesstore())

  // ensure array sizes are correct
  const size = width * height
  const state = store.getState()
  if (state.char.length !== size) {
    state.width = width
    state.height = height
    state.char = new Array(size).fill(char)
    state.color = new Array(size).fill(color)
    state.bg = new Array(size).fill(bg)
    state.render = 0
  }

  return store
}

export function useTilesData() {
  const store = useContext(TilesContext)
  return store.getState() // get ref to shared data/api
}

export type MEDIA_DATA = {
  palette?: BITMAP
  charset?: BITMAP
  mood: string
  screen: Record<string, HTMLVideoElement>
  altcharset?: BITMAP
  palettedata?: Color[]
  charsetdata?: CanvasTexture
  altcharsetdata?: CanvasTexture
  setmood: (mood: string) => void
  setpalette: (palette: MAYBE<BITMAP>) => void
  setcharset: (charset: MAYBE<BITMAP>) => void
  setaltcharset: (altcharset: MAYBE<BITMAP>) => void
  setscreen: (peer: string, screen: MAYBE<HTMLVideoElement>) => void
}

const palette = loadpalettefrombytes(PALETTE)
const charset = loadcharsetfrombytes(CHARSET)

export const useMedia = create<MEDIA_DATA>((set) => ({
  palette,
  charset,
  mood: '',
  screen: {},
  palettedata: convertpalettetocolors(palette),
  charsetdata: createbitmaptexture(charset),
  setmood(mood) {
    set((state) => {
      if (isequal(state.mood, mood)) {
        return state
      }
      return { ...state, mood }
    })
  },
  setpalette(palette) {
    set((state) => {
      if (isequal(state.palette, palette)) {
        return state
      }
      return { ...state, palette, palettedata: convertpalettetocolors(palette) }
    })
  },
  setcharset(charset) {
    set((state) => {
      if (isequal(state.charset, charset)) {
        return state
      }
      return { ...state, charset, charsetdata: createbitmaptexture(charset) }
    })
  },
  setaltcharset(altcharset) {
    set((state) => {
      if (isequal(state.altcharset, altcharset)) {
        return state
      }
      return {
        ...state,
        altcharset,
        altcharsetdata: createbitmaptexture(altcharset),
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
        },
      }
    })
  },
}))

export type DEVICE_CONFIG = {
  insetcols: number
  insetrows: number
  islowrez: boolean
  islandscape: boolean
  sidebaropen: boolean
  keyboardalt: boolean
  keyboardctrl: boolean
  keyboardshift: boolean
  showtouchcontrols: boolean
  checknumbers: string
  wordlist: string[]
  wordlistflag: string
}

export const useDeviceConfig = create<DEVICE_CONFIG>(() => ({
  insetcols: 20,
  insetrows: 20,
  islowrez: false,
  islandscape: true,
  sidebaropen: true,
  keyboardalt: false,
  keyboardctrl: false,
  keyboardshift: false,
  showtouchcontrols: false,
  checknumbers: '',
  wordlist: [],
  wordlistflag: '',
}))
