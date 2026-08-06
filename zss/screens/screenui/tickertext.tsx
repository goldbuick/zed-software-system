import { useLayoutEffect } from 'react'
import { useTickerLayout } from 'zss/gadget/data/tickerlayoutstore'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { resettiles, useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { layouttickers } from 'zss/screens/screenui/tickerlayout'
import {
  createwritetextcontext,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

type ScreenUITickerTextProps = {
  width: number
  height: number
}

export function ScreenUITickerText({ width, height }: ScreenUITickerTextProps) {
  const store = useTiles(width, height, 0, COLOR.WHITE, COLOR.ONCLEAR)
  const tickers = useGadgetClient((state) => state.gadget.tickers)
  const strip = useTickerLayout((state) => state.strip)

  useLayoutEffect(() => {
    const withtickers = tickers ?? []
    const { setlayout, clear } = useTickerLayout.getState()
    if (withtickers.length === 0) {
      clear()
      return
    }
    const layout = layouttickers({ tickers: withtickers })
    setlayout(layout.bubbles, layout.strip, layout.slots)
  }, [tickers])

  useLayoutEffect(() => {
    const state = store.getState()
    const context = {
      ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.ONCLEAR),
      ...state,
      x: 0,
      y: height - 1,
      disablewrap: true,
    }
    resettiles(state, 0, COLOR.WHITE, COLOR.ONCLEAR)

    context.active.color = COLOR.WHITE
    context.active.bg = COLOR.BLACK
    context.active.leftedge = undefined
    context.active.rightedge = undefined
    context.active.topedge = undefined
    context.active.bottomedge = undefined
    context.reset.color = COLOR.WHITE
    context.reset.bg = COLOR.BLACK
    context.disablewrap = true

    // Bottom-left, newest first, grow upward -- no camera/board projection.
    context.x = 0
    context.y = height - 1
    for (let i = 0; i < strip.length; ++i) {
      if (context.y < 0) {
        break
      }
      tokenizeandwritetextformat(strip[i].text, context, false)
      context.x = 0
      context.y--
    }

    state.changed()
  }, [strip, width, height, store])

  return (
    <TilesData store={store}>
      <TilesRender label="tickertext" width={width} height={height} />
    </TilesData>
  )
}
