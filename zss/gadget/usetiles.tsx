import { useContext } from 'react'
import { StoreApi, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { Tiles } from './framedlayer/tiles'
import { TILE_DATA, TilesContext } from './hooks'

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
