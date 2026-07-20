import {
  TICKER_CROWDED_THRESHOLD,
  layouttickers,
  tickeranchorsready,
  tickeromitleadingvisible,
  tickertailchar,
  tickertailoccluded,
} from 'zss/screens/screenui/tickerlayout'
import { tokenizeandstriptextformat } from 'zss/words/textformat'
import type { TICKER_BUBBLE } from 'zss/gadget/data/tickerlayoutstore'

describe('tickeranchorsready', () => {
  it('is true when anchors is empty and tickers is empty', () => {
    expect(tickeranchorsready([], {})).toBe(true)
  })

  it('is false when any ticker id is missing from anchors', () => {
    expect(tickeranchorsready([{ id: 'a', text: 'hi' }], {})).toBe(false)
    expect(
      tickeranchorsready(
        [
          { id: 'a', text: 'hi' },
          { id: 'b', text: 'yo' },
        ],
        { a: { sx: 1, sy: 1, visible: true } },
      ),
    ).toBe(false)
  })

  it('is true when every ticker id has an anchor entry', () => {
    expect(
      tickeranchorsready([{ id: 'a', text: 'hi' }], {
        a: { sx: 0, sy: 0, visible: false },
      }),
    ).toBe(true)
  })
})

describe('tickeromitleadingvisible', () => {
  const PREFIXED =
    '$BLUE$ONBLACK$2$ONCLEAR$CYAN gooby:$WHITE howdy! howdy!'

  it('removes icon char and following space, keeps name/message codes', () => {
    const omitted = tickeromitleadingvisible(PREFIXED)
    expect(omitted).not.toMatch(/\$2/)
    expect(omitted).toContain('$ONCLEAR')
    expect(omitted).toContain('$CYAN')
    expect(omitted).toContain('gooby:')
    expect(omitted).toContain('$WHITE')
    expect(omitted).toContain('howdy!')
    const plain = tokenizeandstriptextformat(omitted)
    expect(plain.startsWith('gooby:')).toBe(true)
    expect(plain.charAt(0)).toBe('g')
  })

  it('is a no-op when count is 0', () => {
    expect(tickeromitleadingvisible(PREFIXED, 0)).toBe(PREFIXED)
  })

  it('leaves short plain text empty when fewer than count cells', () => {
    expect(tickeromitleadingvisible('hi')).toBe('')
  })
})

describe('layouttickers', () => {
  it('places a visible ticker as a bubble above the anchor', () => {
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'hi' }],
      anchors: { a: { sx: 20, sy: 15, visible: true } },
      cols: 40,
      rows: 25,
    })
    expect(result.strip).toEqual([])
    expect(result.bubbles).toHaveLength(1)
    expect(result.bubbles[0].id).toBe('a')
    expect(result.bubbles[0].tiley).toBeLessThan(15)
    expect(result.bubbles[0].tiley + result.bubbles[0].height).toBeLessThan(15)
    expect(result.slots.a).toBeDefined()
  })

  it('stores omitted icon prefix on bubbles but full text on strip', () => {
    const full =
      '$BLUE$ONBLACK$2$ONCLEAR$CYAN gooby:$WHITE howdy! howdy!'
    const result = layouttickers({
      tickers: [
        { id: 'a', text: full },
        { id: 'b', text: full },
      ],
      anchors: {
        a: { sx: 12, sy: 10, visible: true },
        b: { sx: 0, sy: 0, visible: false },
      },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles).toHaveLength(1)
    expect(result.bubbles[0].text).toBe(tickeromitleadingvisible(full))
    expect(result.bubbles[0].text).not.toContain('$2')
    expect(result.strip).toHaveLength(1)
    expect(result.strip[0].text).toBe(full)
  })

  it('does not cover the speaker tile with the bubble body', () => {
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'gooby: howdy' }],
      anchors: { a: { sx: 12, sy: 10, visible: true } },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles).toHaveLength(1)
    const bubble = result.bubbles[0]
    const speakery = 10
    expect(bubble.tiley + bubble.height).toBeLessThanOrEqual(speakery - 1)
    expect(
      bubble.tilex <= 12 && bubble.tilex + bubble.width > 12,
    ).toBe(true)
  })

  it('may cover another speaker while never covering its own', () => {
    // b sits where a prefers to place (speakery - height - 2)
    const result = layouttickers({
      tickers: [
        { id: 'a', text: 'hello there friend' },
        { id: 'b', text: 'hello there friend' },
      ],
      anchors: {
        a: { sx: 20, sy: 15, visible: true },
        b: { sx: 20, sy: 12, visible: true },
      },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles.length).toBe(2)
    const bubblea = result.bubbles.find((b) => b.id === 'a')
    const bubbleb = result.bubbles.find((b) => b.id === 'b')
    expect(bubblea).toBeDefined()
    expect(bubbleb).toBeDefined()
    expect(bubblea!.tiley + bubblea!.height).toBeLessThanOrEqual(14)
    expect(bubbleb!.tiley + bubbleb!.height).toBeLessThanOrEqual(11)
    const acoversb =
      bubblea!.tilex <= 20 &&
      bubblea!.tilex + bubblea!.width > 20 &&
      bubblea!.tiley <= 12 &&
      bubblea!.tiley + bubblea!.height > 12
    expect(acoversb).toBe(true)
  })

  it('pins the down-tail row below the bubble and keeps continuous anchor', () => {
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'gooby: howdy there friend' }],
      anchors: { a: { sx: 12.0, sy: 14, visible: true } },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles).toHaveLength(1)
    const bubble = result.bubbles[0]
    expect(bubble.taildir).toBe('down')
    expect(bubble.anchorsx).toBe(12.0)
    expect(bubble.taily).toBe(bubble.tiley + bubble.height)
  })

  it('preserves fractional speaker x for sub-tile tail centering', () => {
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'hi' }],
      anchors: { a: { sx: 20.0, sy: 14, visible: true } },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles).toHaveLength(1)
    // Even cols => screen center is a tile boundary; continuous sx must stay
    // fractional-capable (integer is ok) for the renderer to center the glyph
    expect(result.bubbles[0].anchorsx).toBe(20.0)
  })

  it('ignores prior slots that still cover the speaker', () => {
    // Text long enough that omit-leading still leaves width covering speaker x
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'hello there friend' }],
      anchors: { a: { sx: 20, sy: 15, visible: true } },
      cols: 40,
      rows: 25,
      priorslots: { a: { tilex: 19, tiley: 15 } },
    })
    expect(result.bubbles).toHaveLength(1)
    expect(result.bubbles[0].tiley + result.bubbles[0].height).toBeLessThan(15)
  })

  it('sends explicit visible:false to the strip lane', () => {
    const result = layouttickers({
      tickers: [
        { id: 'a', text: 'visible' },
        { id: 'b', text: 'gone' },
      ],
      anchors: {
        a: { sx: 10, sy: 10, visible: true },
        b: { sx: 0, sy: 0, visible: false },
      },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles.map((b) => b.id)).toEqual(['a'])
    expect(result.strip.map((t) => t.id)).toEqual(['b'])
  })

  it('does not put missing anchors on the strip lane', () => {
    const result = layouttickers({
      tickers: [
        { id: 'a', text: 'ready' },
        { id: 'b', text: 'notyet' },
      ],
      anchors: {
        a: { sx: 10, sy: 10, visible: true },
      },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles.map((b) => b.id)).toEqual(['a'])
    expect(result.strip).toEqual([])
  })

  it('emits empty layout when anchors are empty (no strip flash)', () => {
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'hi' }],
      anchors: {},
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles).toEqual([])
    expect(result.strip).toEqual([])
  })

  it('clamps bubbles inside the viewport', () => {
    const result = layouttickers({
      tickers: [{ id: 'a', text: 'edge' }],
      anchors: { a: { sx: 0, sy: 0, visible: true } },
      cols: 40,
      rows: 25,
    })
    const bubble = result.bubbles[0]
    expect(bubble).toBeDefined()
    expect(bubble.tilex).toBeGreaterThanOrEqual(0)
    expect(bubble.tiley).toBeGreaterThanOrEqual(0)
    expect(bubble.tilex + bubble.width).toBeLessThanOrEqual(40)
    expect(bubble.tiley + bubble.height).toBeLessThanOrEqual(25)
  })

  it('keeps prior slot when still near the anchor (slot memory)', () => {
    const first = layouttickers({
      tickers: [{ id: 'a', text: 'hi' }],
      anchors: { a: { sx: 20, sy: 15, visible: true } },
      cols: 40,
      rows: 25,
    })
    const second = layouttickers({
      tickers: [{ id: 'a', text: 'hi' }],
      anchors: { a: { sx: 20.5, sy: 15.2, visible: true } },
      cols: 40,
      rows: 25,
      priorslots: first.slots,
    })
    expect(second.slots.a).toEqual(first.slots.a)
  })

  it('moves overflow past crowded threshold to the strip lane', () => {
    const tickers = []
    const anchors: Record<
      string,
      { sx: number; sy: number; visible: boolean }
    > = {}
    for (let i = 0; i < TICKER_CROWDED_THRESHOLD + 3; ++i) {
      const id = `t${i}`
      tickers.push({ id, text: `msg${i}` })
      anchors[id] = { sx: 10 + i, sy: 12, visible: true }
    }
    const result = layouttickers({
      tickers,
      anchors,
      cols: 60,
      rows: 25,
    })
    expect(result.bubbles.length).toBe(TICKER_CROWDED_THRESHOLD)
    expect(result.strip.length).toBe(3)
  })

  it('stacks overlapping speakers without colliding', () => {
    const result = layouttickers({
      tickers: [
        { id: 'a', text: 'one' },
        { id: 'b', text: 'two' },
      ],
      anchors: {
        a: { sx: 20, sy: 15, visible: true },
        b: { sx: 20, sy: 15, visible: true },
      },
      cols: 40,
      rows: 25,
    })
    expect(result.bubbles.length).toBe(2)
    const [first, second] = result.bubbles
    const overlap =
      first.tilex < second.tilex + second.width &&
      first.tilex + first.width > second.tilex &&
      first.tiley < second.tiley + second.height &&
      first.tiley + first.height > second.tiley
    expect(overlap).toBe(false)
  })
})

describe('tickertailchar', () => {
  it('returns ASCII format codes for directions', () => {
    expect(tickertailchar('up')).toBe('$24')
    expect(tickertailchar('down')).toBe('$25')
    expect(tickertailchar('right')).toBe('$26')
    expect(tickertailchar('left')).toBe('$27')
    expect(tickertailchar('none')).toBe('')
  })
})

describe('tickertailoccluded', () => {
  function bubble(
    partial: Partial<TICKER_BUBBLE> & Pick<TICKER_BUBBLE, 'id'>,
  ): TICKER_BUBBLE {
    return {
      tilex: 0,
      tiley: 0,
      width: 10,
      height: 1,
      text: 'hi',
      taildir: 'down',
      tailx: 5,
      taily: 1,
      anchorsx: 5,
      anchorsy: 3,
      ...partial,
    }
  }

  it('is true when tip sits on another bubble panel', () => {
    const upper = bubble({
      id: 'upper',
      tiley: 2,
      height: 1,
      taily: 3,
      tailx: 5,
    })
    const lower = bubble({
      id: 'lower',
      tiley: 3,
      height: 1,
      width: 12,
      tailx: 5,
      taily: 4,
    })
    expect(tickertailoccluded(upper, [upper, lower])).toBe(true)
  })

  it('is false when tip is in the gap toward the speaker', () => {
    const upper = bubble({
      id: 'upper',
      tiley: 2,
      height: 1,
      taily: 3,
      tailx: 5,
    })
    const lower = bubble({
      id: 'lower',
      tiley: 4,
      height: 1,
      width: 12,
      tailx: 5,
      taily: 5,
    })
    // upper tip at y=3, lower panel at y=4 -- gap row is free
    expect(tickertailoccluded(upper, [upper, lower])).toBe(false)
  })

  it('does not treat own panel as an occluder', () => {
    const alone = bubble({ id: 'a', tiley: 5, height: 2, taily: 4, tailx: 5 })
    expect(tickertailoccluded(alone, [alone])).toBe(false)
  })
})
