import {
  boardtvslidegateinitial,
  boardtvslidegateonclosed,
  boardtvslidegatestep,
} from 'zss/feature/mediaqueue/boardtvslidegate'

describe('boardtvslidegate', () => {
  it('opens when wantshow becomes true', () => {
    const next = boardtvslidegatestep(boardtvslidegateinitial(), true)
    expect(next).toEqual({ active: true, shouldclose: false })
  })

  it('holds active and sets shouldclose when wantshow goes false', () => {
    const open = boardtvslidegatestep(boardtvslidegateinitial(), true)
    const closing = boardtvslidegatestep(open, false)
    expect(closing).toEqual({ active: true, shouldclose: true })
  })

  it('stays inactive when wantshow is false and never opened', () => {
    expect(boardtvslidegatestep(boardtvslidegateinitial(), false)).toEqual({
      active: false,
      shouldclose: false,
    })
  })

  it('reopens from closing when wantshow returns', () => {
    const open = boardtvslidegatestep(boardtvslidegateinitial(), true)
    const closing = boardtvslidegatestep(open, false)
    const reopen = boardtvslidegatestep(closing, true)
    expect(reopen).toEqual({ active: true, shouldclose: false })
  })

  it('onclosed clears active and shouldclose', () => {
    expect(boardtvslidegateonclosed()).toEqual({
      active: false,
      shouldclose: false,
    })
  })
})
