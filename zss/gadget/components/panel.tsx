import { gadgetstategetplayer } from 'zss/device/gadgetclient'

import {
  WRITE_TEXT_CONTEXT,
  WriteTextContext,
  createwritetextcontext,
} from '../data/textformat'
import { PANEL_ITEM } from '../data/types'

import { PanelItem } from './panel/panelitem'
import { PlayerContext } from './useplayer'
import { TilesData, TilesRender, resetTiles, useTiles } from './usetiles'

type PanelProps = {
  margin?: number
  selected?: number
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
}

export function Panel({
  margin = 1,
  selected = -1,
  width,
  height,
  color,
  bg,
  text,
}: PanelProps) {
  const player = gadgetstategetplayer()
  const store = useTiles(width, height, 0, color, bg)
  const state = store.getState()
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(
      width,
      height,
      color,
      bg,
      0,
      margin,
      width - margin,
      height,
    ),
    ...store.getState(),
    x: margin,
  }

  resetTiles(state, 0, color, bg)
  state.changed()

  return (
    <TilesData store={store}>
      <PlayerContext.Provider value={player}>
        <WriteTextContext.Provider value={context}>
          {text.map((item, index) => (
            <PanelItem key={index} item={item} active={index === selected} />
          ))}
        </WriteTextContext.Provider>
      </PlayerContext.Provider>
      <TilesRender width={width} height={height} />
    </TilesData>
  )
}
