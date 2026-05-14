import { useContext } from 'react'
import type { Plane } from 'three'
import { TILE_DATA, TilesContext } from 'zss/gadget/tiles'
import { recordtilerenderrun } from 'zss/perf/renderupdatestats'
import { StoreApi, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { Tiles } from './graphics/tiles'

type TilesDataProps = React.PropsWithChildren<{
  store: StoreApi<TILE_DATA>
}>

export function TilesData({ store, children }: TilesDataProps) {
  return <TilesContext.Provider value={store}>{children}</TilesContext.Provider>
}

type TilesRenderProps = {
  label: string
  width: number
  height: number
  clippingplanes?: Plane[]
  skipraycast?: boolean
}

export function TilesRender({
  label,
  width,
  height,
  clippingplanes,
  skipraycast,
}: TilesRenderProps) {
  const store = useContext(TilesContext)
  const [char, color, bg, render] = useStore(
    store,
    useShallow((state) => [state.char, state.color, state.bg, state.render]),
  )
  recordtilerenderrun()
  return (
    width > 0 &&
    height > 0 && (
      <Tiles
        label={label}
        char={char}
        color={color}
        bg={bg}
        tilesversion={render}
        width={width}
        height={height}
        clippingplanes={clippingplanes}
        skipraycast={skipraycast}
      />
    )
  )
}
