import {
  layouttickers,
  sorttickersnewestfirst,
  tickeranchorsready,
} from 'zss/screens/screenui/tickerlayout'

describe('sorttickersnewestfirst', () => {
  it('orders by tickertime descending', () => {
    const sorted = sorttickersnewestfirst([
      { id: 'old', text: 'a', tickertime: 10 },
      { id: 'new', text: 'b', tickertime: 30 },
      { id: 'mid', text: 'c', tickertime: 20 },
    ])
    expect(sorted.map((t) => t.id)).toEqual(['new', 'mid', 'old'])
  })

  it('breaks ties by id ascending', () => {
    const sorted = sorttickersnewestfirst([
      { id: 'b', text: 'b', tickertime: 5 },
      { id: 'a', text: 'a', tickertime: 5 },
    ])
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('layouttickers', () => {
  it('returns empty bubbles and newest-first strip', () => {
    const result = layouttickers({
      tickers: [
        { id: 'old', text: 'older', tickertime: 1 },
        { id: 'new', text: 'newer', tickertime: 9 },
      ],
    })
    expect(result.bubbles).toEqual([])
    expect(result.slots).toEqual({})
    expect(result.strip.map((t) => t.id)).toEqual(['new', 'old'])
  })

  it('passes through empty tickers', () => {
    const result = layouttickers({ tickers: [] })
    expect(result.bubbles).toEqual([])
    expect(result.strip).toEqual([])
  })
})

describe('tickeranchorsready', () => {
  it('is true when every ticker id is present', () => {
    expect(
      tickeranchorsready(
        [{ id: 'a', text: 'x', tickertime: 1 }],
        { a: { sx: 1, sy: 2, visible: true } },
      ),
    ).toBe(true)
  })

  it('is false when an id is missing', () => {
    expect(
      tickeranchorsready([{ id: 'a', text: 'x', tickertime: 1 }], {}),
    ).toBe(false)
  })
})
