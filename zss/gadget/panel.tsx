import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

import { PANEL_ITEM } from './data/types'
import { resetTiles, useTiles, WriteTextContext } from './hooks'
import { PanelItem } from './panel/panelitem'
import { TilesData, TilesRender } from './usetiles'

type PanelProps = {
  xmargin?: number
  ymargin?: number
  selected?: number
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
}

export function Panel({
  xmargin = 1,
  ymargin = 1,
  selected = -1,
  width,
  height,
  color,
  bg,
  text,
}: PanelProps) {
  const store = useTiles(width, height, 0, color, bg)
  const state = store.getState()
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(
      width,
      height,
      color,
      bg,
      ymargin,
      xmargin,
      width - xmargin,
      height - ymargin,
    ),
    ...store.getState(),
    x: xmargin,
    y: ymargin,
  }

  resetTiles(state, 0, color, bg)
  state.changed()

  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        {text.map((item, index) => (
          <PanelItem key={index} item={item} active={index === selected} />
        ))}
      </WriteTextContext.Provider>
      <TilesRender width={width} height={height} />
    </TilesData>
  )
}
