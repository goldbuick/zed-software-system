import { createContext, useContext, useState } from 'react'
import { objectKeys } from 'ts-extras'
import { TILES } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { createwritetextcontext } from 'zss/words/textformat'
import { create, createStore, StoreApi } from 'zustand'

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
    function inc() {
      set({ render: Math.random() })
    }
    return {
      dither: [],
      render: 0,
      changed() {
        setTimeout(inc, 0)
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
    function inc() {
      set({ render: Math.random() })
    }
    return {
      width: 0,
      height: 0,
      char: [],
      color: [],
      bg: [],
      render: 0,
      changed() {
        setTimeout(inc, 0)
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
