import { useMemo } from 'react'
import { useGadgetClient } from 'zss/gadget/data/state'
import { resetTiles, useTiles } from 'zss/gadget/hooks'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
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
  const context: WRITE_TEXT_CONTEXT = useMemo(() => {
    return {
      ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.BLACK),
      ...store.getState(),
    }
  }, [width, height, store])

  if (ispresent(tickers)) {
    context.x = 0
    context.y = height - 1
    context.disablewrap = true
    const state = store.getState()
    resetTiles(state, 0, COLOR.WHITE, COLOR.ONCLEAR)
    for (let i = 0; i < tickers.length; ++i) {
      const line = tickers[i]
      tokenizeandwritetextformat(line, context, false)
      context.x = 0
      context.y--
    }
  }

  return (
    <TilesData store={store}>
      <TilesRender width={width} height={height} />
    </TilesData>
  )
}
