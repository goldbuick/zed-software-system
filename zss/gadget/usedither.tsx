import { useContext } from 'react'
import { DITHER_DATA, DitherContext } from 'zss/gadget/dither'
import { StoreApi, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { Dither } from './graphics/dither'

type DitherDataProps = React.PropsWithChildren<{
  store: StoreApi<DITHER_DATA>
}>

export function DitherData({ store, children }: DitherDataProps) {
  return (
    <DitherContext.Provider value={store}>{children}</DitherContext.Provider>
  )
}

type DitherRenderProps = {
  width: number
  height: number
}

export function DitherRender({ width, height }: DitherRenderProps) {
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
