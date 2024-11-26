/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { createStore, StoreApi, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { Dither } from './framed/dither'

type DITHER_DATA = {
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

const DitherContext = createContext(createditherstore())

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

type DitherDataProps = React.PropsWithChildren<{
  store: StoreApi<DITHER_DATA>
}>

export function DitherData({ store, children }: DitherDataProps) {
  return (
    <DitherContext.Provider value={store}>{children}</DitherContext.Provider>
  )
}

type DitherSnapshotProps = {
  width: number
  height: number
}

export function DitherRender({ width, height }: DitherSnapshotProps) {
  const store = useContext(DitherContext)
  const [dither] = useStore(
    store,
    useShallow((state) => [state.dither, state.render]),
  )
  return (
    width > 0 &&
    height > 0 && (
      <Dither alphas={dither.slice()} width={width} height={height} />
    )
  )
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
