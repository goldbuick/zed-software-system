import { useContext } from 'react'
import type { Plane } from 'three'
import { TILE_DATA, TilesContext } from 'zss/gadget/tiles'
import { StoreApi, useStore } from 'zustand'

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

/**
 * Subscribes only to `state.render` (microtask-batched version counter). Reads
 * char/color/bg via `getState()` and passes stable array references through; the
 * `version` prop on `<Tiles>` drives its data-upload effect, so no `.slice()`
 * copies are needed per render.
 */
export function TilesRender({
  label,
  width,
  height,
  clippingplanes,
  skipraycast,
}: TilesRenderProps) {
  const store = useContext(TilesContext)
  const render = useStore(store, (state) => state.render)
  const { char, color, bg } = store.getState()
  return (
    width > 0 &&
    height > 0 && (
      <Tiles
        label={label}
        char={char}
        color={color}
        bg={bg}
        version={render}
        width={width}
        height={height}
        clippingplanes={clippingplanes}
        skipraycast={skipraycast}
      />
    )
  )
}
