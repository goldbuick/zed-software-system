import { createContext, useState } from 'react'
import { StoreApi, createStore } from 'zustand'

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

export function resetdither(dither: number[]) {
  dither.fill(0)
}

export function writedither(
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

  const size = width * height
  const state = store.getState()
  if (state.dither.length !== size) {
    state.dither = new Array(size).fill(dither)
    state.render = 0
  }

  return store
}
