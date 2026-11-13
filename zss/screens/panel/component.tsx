import { useCallback, useContext, useMemo } from 'react'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { type TILES_MEDIA_SOURCE } from 'zss/gadget/gadgetmedia'
import { resettiles, useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import { perfmeasure } from 'zss/perf/ui'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

import { ScrollContext } from './common'
import { PanelItem } from './panelitem'
import { RowSelectHit } from './rowselecthit'

type PanelProps = {
  inline?: boolean
  xmargin?: number
  ymargin?: number
  selected?: number
  /** Content index base for even/odd striping (scroll offset); draw Y stays index + ymargin */
  striperowbase?: number
  /** Per-visible-item draw Y within the panel (variable-height rows). */
  rowys?: number[]
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
  /** board = playfield charset/palette; ui = chrome. Default ui. */
  mediasource?: TILES_MEDIA_SOURCE
  /** Row select owner; defaults to ScrollContext.setcursor. */
  onselectrow?: (contentindex: number) => void
}

export function PanelComponent({
  inline = false,
  xmargin = 1,
  ymargin = 1,
  selected = -1,
  striperowbase = 0,
  rowys,
  width,
  height,
  color,
  bg,
  text,
  mediasource = 'ui',
  onselectrow,
}: PanelProps) {
  const store = useTiles(width, height, 0, color, bg)
  const state = store.getState()
  const scroll = useContext(ScrollContext)
  const hitx = xmargin !== 0 ? 1 : 0
  const hitwidth = Math.max(1, width - hitx)

  const selectrow = useCallback(
    (contentindex: number) => {
      if (onselectrow) {
        onselectrow(contentindex)
        return
      }
      scroll.setcursor(contentindex)
    },
    [onselectrow, scroll],
  )

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
        height - ymargin - 1,
      ),
      ...store.getState(),
      x: xmargin,
      y: ymargin,
    }),
    [bg, color, height, store, width, xmargin, ymargin],
  )

  resettiles(state, 0, color, bg)

  return (
    <TilesData store={store}>
      <TilesRender
        label="panel"
        width={width}
        height={height}
        mediasource={mediasource}
        skipraycast
      />
      <WriteTextContext.Provider value={context}>
        {perfmeasure('panel:items', () =>
          text.map((item, index) => (
            <PanelItem
              key={striperowbase + index}
              row={inline ? undefined : (rowys?.[index] ?? index) + ymargin}
              striperow={striperowbase + index}
              item={item}
              active={index === selected}
              sidebar={xmargin !== 0}
            />
          )),
        )}
        {!inline &&
          text.map((_, index) => {
            const drawy = (rowys?.[index] ?? index) + ymargin
            // Without rowys each item is one row; do not stretch hits to panel bottom
            // (that stacked full-panel planes and broke per-row select).
            let rowheight = 1
            if (rowys) {
              const nextdrawy =
                index + 1 < rowys.length
                  ? rowys[index + 1] + ymargin
                  : height - ymargin
              rowheight = Math.max(1, nextdrawy - drawy)
            }
            const contentindex = striperowbase + index
            return (
              <RowSelectHit
                key={`rowhit-${contentindex}`}
                x={hitx}
                y={drawy}
                width={hitwidth}
                height={rowheight}
                onselect={() => selectrow(contentindex)}
              />
            )
          })}
      </WriteTextContext.Provider>
    </TilesData>
  )
}
