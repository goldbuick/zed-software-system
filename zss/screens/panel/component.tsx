import { useMemo, useRef } from 'react'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { resettiles, useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import { perfmeasure } from 'zss/perf/ui'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

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

export function PanelComponent({
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
  const textref = useRef(text)
  const store = useTiles(width, height, 0, color, bg)
  const state = store.getState()
  const context: WRITE_TEXT_CONTEXT = useMemo(
    () => ({
      ...createwritetextcontext(
        width,
        height,
        color,
        bg,
        ymargin,
        xmargin,
        width - xmargin - 1,
        height - ymargin,
      ),
      ...store.getState(),
      padlineright: true,
      panelcarry: true,
      x: xmargin,
      y: ymargin,
    }),
    [bg, color, height, store, width, xmargin, ymargin],
  )

  if (textref.current !== text) {
    context.panelcarrycolor = undefined
    context.panelcarrybg = undefined
    textref.current = text
  }

  resettiles(state, 0, color, bg)

  return (
    <TilesData store={store}>
      <TilesRender label="panel" width={width} height={height} />
      <WriteTextContext.Provider value={context}>
        {perfmeasure('panel:items', () =>
          text.map((item, index) => (
            <PanelItem
              key={index}
              row={inline ? undefined : index}
              item={item}
              active={index === selected}
              sidebar={xmargin !== 0}
            />
          )),
        )}
      </WriteTextContext.Provider>
    </TilesData>
  )
}
