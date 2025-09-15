import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

import { PANEL_ITEM } from '../data/types'
import { WriteTextContext, resetTiles, useTiles } from '../hooks'
import { TilesData, TilesRender } from '../usetiles'

import { PanelItem } from './panelitem'

type PanelProps = {
  inline?: boolean
  xmargin?: number
  ymargin?: number
  selected?: number
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
}

export function Panel({
  inline = false,
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

  return (
    <TilesData store={store}>
      <TilesRender width={width} height={height} />
      <WriteTextContext.Provider value={context}>
        {text.map((item, index) => (
          <PanelItem
            key={index}
            row={inline ? undefined : index}
            item={item}
            active={index === selected}
            sidebar={xmargin !== 0}
          />
        ))}
      </WriteTextContext.Provider>
    </TilesData>
  )
}
