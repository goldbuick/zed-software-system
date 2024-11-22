/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { objectKeys } from 'ts-extras'
import { ispresent } from 'zss/mapping/types'
import { createStore, StoreApi, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { TILES } from '../data/types'

import { Tiles } from './tiles'

type TILE_DATA = {
  char: number[]
  color: number[]
  bg: number[]
  render: number
  changed: () => void
}

function createtilesstore() {
  return createStore<TILE_DATA>((set) => {
    return {
      char: [],
      color: [],
      bg: [],
      render: 0,
      changed() {
        set((state) => ({ render: state.render + 1 }))
      },
    }
  })
}

const TilesContext = createContext(createtilesstore())

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
    state.char = new Array(size).fill(char)
    state.color = new Array(size).fill(color)
    state.bg = new Array(size).fill(bg)
    state.render = 0
  }

  return store
}

type TilesDataProps = React.PropsWithChildren<{
  store: StoreApi<TILE_DATA>
}>

export function TilesData({ store, children }: TilesDataProps) {
  return <TilesContext.Provider value={store}>{children}</TilesContext.Provider>
}

type TilesRenderProps = {
  width: number
  height: number
}

export function TilesRender({ width, height }: TilesRenderProps) {
  const store = useContext(TilesContext)
  const [char, color, bg] = useStore(
    store,
    useShallow((state) => [state.char, state.color, state.bg, state.render]),
  )
  return (
    width > 0 &&
    height > 0 && (
      <Tiles
        char={char.slice()}
        color={color.slice()}
        bg={bg.slice()}
        width={width}
        height={height}
      />
    )
  )
}

export function resetTiles(
  tiles: TILES,
  char: number,
  color: number,
  bg: number,
) {
  console.info('resetTiles', tiles)
  tiles.char = new Array(tiles.char.length).fill(char)
  tiles.color = new Array(tiles.color.length).fill(color)
  tiles.bg = new Array(tiles.bg.length).fill(bg)
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
