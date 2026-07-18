import { createContext, useContext, useState } from 'react'
import { objectKeys } from 'ts-extras'
import { pttoindex } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { StoreApi, createStore } from 'zustand'

export type TILE_DATA = {
  width: number
  height: number
  char: (string | number)[]
  color: number[]
  bg: number[]
  render: number
  changed: () => void
}

/** Minimal shape needed for resettiles/writetile; accept store state or WRITE_TEXT_CONTEXT. */
type TILES_LIKE = Pick<TILE_DATA, 'char' | 'color' | 'bg'>

function createtilesstore() {
  return createStore<TILE_DATA>((set) => {
    function changed() {
      set((state) => {
        return { render: state.render + 1 }
      })
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

export function resettiles(
  tiles: TILES_LIKE,
  char: number,
  color: number,
  bg: number,
) {
  tiles.char.fill(char)
  tiles.color.fill(color)
  tiles.bg.fill(bg)
}

type WRITE_TILE_VALUE = {
  char?: string | number
  color?: number
  bg?: number
}

export function writetile(
  tiles: TILES_LIKE,
  width: number,
  height: number,
  x: number,
  y: number,
  value: Partial<WRITE_TILE_VALUE>,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return
  }

  const index = pttoindex({ x, y }, width)
  objectKeys(value).forEach((key) => {
    const v = value[key]
    if (ispresent(v)) {
      tiles[key][index] = v
    }
  })
}

export const TilesContext = createContext(createtilesstore())

function createtilesstoreatsizes(
  width: number,
  height: number,
  char: number,
  color: number,
  bg: number,
): StoreApi<TILE_DATA> {
  const store = createtilesstore()
  const size = width * height
  // Fresh store: no subscribers yet, so setState during hook setup is safe.
  store.setState({
    width,
    height,
    char: new Array(size).fill(char),
    color: new Array(size).fill(color),
    bg: new Array(size).fill(bg),
    render: 0,
  })
  return store
}

export function useTiles(
  width: number,
  height: number,
  char: number,
  color: number,
  bg: number,
): StoreApi<TILE_DATA> {
  const [store, setstore] = useState(() =>
    createtilesstoreatsizes(width, height, char, color, bg),
  )

  const size = width * height
  const state = store.getState()
  // Resize when cell count OR aspect changes (same area, different cols/rows).
  // Replace the store via React setState (same component) -- do not zustand
  // setState on the live store here; that notifies TilesRender mid-render.
  if (
    state.char.length !== size ||
    state.width !== width ||
    state.height !== height
  ) {
    const next = createtilesstoreatsizes(width, height, char, color, bg)
    setstore(next)
    return next
  }

  return store
}

export function useTilesData() {
  const store = useContext(TilesContext)
  return store.getState()
}
