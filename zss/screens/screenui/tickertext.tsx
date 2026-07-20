import { useLayoutEffect } from 'react'
import { RUNTIME } from 'zss/config'
import type { TICKER_BUBBLE } from 'zss/gadget/data/tickerlayoutstore'
import { useTickerLayout } from 'zss/gadget/data/tickerlayoutstore'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { StaticDither } from 'zss/gadget/graphics/dither'
import { Tiles } from 'zss/gadget/graphics/tiles'
import { resettiles, useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import {
  layouttickers,
  tickeranchorsready,
  tickertailcode,
  tickertailoccluded,
} from 'zss/screens/screenui/tickerlayout'
import {
  createwritetextcontext,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

type ScreenUITickerTextProps = {
  width: number
  height: number
}

function writebubbletext(
  bubble: TICKER_BUBBLE,
  context: ReturnType<typeof createwritetextcontext> & {
    char: (string | number)[]
    color: number[]
    bg: number[]
    changed: () => void
  },
) {
  context.x = bubble.tilex
  context.y = bubble.tiley
  context.disablewrap = false
  // Match measureticker wrap: constrain to bubble tile rect, not full screen
  context.active.leftedge = bubble.tilex
  context.active.rightedge = bubble.tilex + bubble.width - 1
  context.active.topedge = bubble.tiley
  context.active.bottomedge = bubble.tiley + bubble.height - 1
  tokenizeandwritetextformat(bubble.text, context, false)
  context.active.leftedge = undefined
  context.active.rightedge = undefined
  context.active.topedge = undefined
  context.active.bottomedge = undefined
  // Tail is rendered as a sub-tile-positioned 1x1 mesh so it can sit on the
  // continuous speaker center (screen-center speakers land on tile boundaries).
}

function tailposition(
  bubble: TICKER_BUBBLE,
  cw: number,
  ch: number,
): [number, number, number] {
  // Glyph center of a 1x1 tile mesh at origin is at (0.5*cw, 0.5*ch) in local
  // space. Place the mesh so that center sits on the continuous speaker anchor
  // along the tip axis, and on the integer tip tile along the other axis.
  switch (bubble.taildir) {
    case 'up':
    case 'down':
      return [(bubble.anchorsx - 0.5) * cw, bubble.taily * ch, 0]
    case 'left':
    case 'right':
      return [bubble.tailx * cw, (bubble.anchorsy - 0.5) * ch, 0]
    default:
      return [(bubble.anchorsx - 0.5) * cw, bubble.taily * ch, 0]
  }
}

export function ScreenUITickerText({ width, height }: ScreenUITickerTextProps) {
  const store = useTiles(width, height, 0, COLOR.WHITE, COLOR.ONCLEAR)
  const tickers = useGadgetClient((state) => state.gadget.tickers)
  const anchors = useTickerLayout((state) => state.anchors)
  const bubbles = useTickerLayout((state) => state.bubbles)
  const strip = useTickerLayout((state) => state.strip)

  useLayoutEffect(() => {
    const withtickers = tickers ?? []
    const { slots, setlayout, clear } = useTickerLayout.getState()
    if (withtickers.length === 0) {
      clear()
      return
    }
    // Wait for projector to publish every id -- missing keys must not strip
    if (!tickeranchorsready(withtickers, anchors)) {
      return
    }
    const layout = layouttickers({
      tickers: withtickers,
      anchors,
      cols: width,
      rows: height,
      priorslots: slots,
    })
    setlayout(layout.bubbles, layout.strip, layout.slots)
  }, [tickers, anchors, width, height])

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

    for (let i = 0; i < bubbles.length; ++i) {
      writebubbletext(bubbles[i], context)
    }

    // Strip has no dither; solid black bg for readability
    context.active.color = COLOR.WHITE
    context.active.bg = COLOR.BLACK
    context.active.leftedge = undefined
    context.active.rightedge = undefined
    context.active.topedge = undefined
    context.active.bottomedge = undefined
    context.reset.color = COLOR.WHITE
    context.reset.bg = COLOR.BLACK
    context.disablewrap = true
    context.x = 0
    context.y = height - 1
    for (let i = 0; i < strip.length; ++i) {
      tokenizeandwritetextformat(strip[i].text, context, false)
      context.x = 0
      context.y--
      if (context.y < 0) {
        break
      }
    }

    state.changed()
  }, [bubbles, strip, width, height, store])

  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()

  return (
    <>
      {bubbles.map((bubble) => (
        <group
          key={`dither-${bubble.id}`}
          position={[bubble.tilex * cw, bubble.tiley * ch, -1]}
        >
          <StaticDither
            width={bubble.width}
            height={bubble.height}
            alpha={0.5}
          />
        </group>
      ))}
      {bubbles.map((bubble) => {
        const code = tickertailcode(bubble.taildir)
        if (!code) {
          return null
        }
        if (
          bubble.taily < 0 ||
          bubble.taily >= height ||
          bubble.tailx < -1 ||
          bubble.tailx > width
        ) {
          return null
        }
        if (tickertailoccluded(bubble, bubbles)) {
          return null
        }
        return (
          <group
            key={`tail-${bubble.id}`}
            position={tailposition(bubble, cw, ch)}
          >
            <Tiles
              label={`tickertail-${bubble.id}`}
              width={1}
              height={1}
              char={[code]}
              color={[COLOR.WHITE]}
              bg={[COLOR.ONCLEAR]}
            />
          </group>
        )
      })}
      <TilesData store={store}>
        <TilesRender label="tickertext" width={width} height={height} />
      </TilesData>
    </>
  )
}
