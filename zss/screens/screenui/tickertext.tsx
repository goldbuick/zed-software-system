import { useLayoutEffect } from 'react'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { resettiles, useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
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

  useLayoutEffect(() => {
    const withtickers = tickers ?? []
    const state = store.getState()
    const context = {
      ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.BLACK),
      ...state,
      x: 0,
      y: height - 1,
      disablewrap: true,
    }
    resettiles(state, 0, COLOR.WHITE, COLOR.ONCLEAR)
    for (let i = 0; i < withtickers.length; ++i) {
      tokenizeandwritetextformat(withtickers[i], context, false)
      context.x = 0
      context.y--
    }
    state.changed()
  }, [tickers, width, height, store])

  return (
    <TilesData store={store}>
      <TilesRender label="tickertext" width={width} height={height} />
    </TilesData>
  )
}
