import { terminalbookmarkpindisplaylabel } from 'zss/feature/terminalbookmarkline'

describe('terminalbookmarkpindisplaylabel', () => {
  it('shows right-hand label after semicolon for bang lines', () => {
    expect(
      terminalbookmarkpindisplaylabel('!hyperlink chip x;$GREENmy title'),
    ).toBe('$GREENmy title')
  })
})
