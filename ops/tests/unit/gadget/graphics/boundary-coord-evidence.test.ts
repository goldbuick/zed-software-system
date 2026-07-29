/**
 * Evidence: camera pan-first edge glide vs sprite teleport snap (BC2/BC3).
 * Camera pans in the departure frame then recenters; sprites snap on edge-sized jumps.
 */
import {
  type FocusUserData,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import { spriteshouldsnapposition } from 'zss/gadget/graphics/spritesboardsnap'
import { BOARD_WIDTH } from 'zss/memory/types'

describe('boundary coord evidence (camera pan-first)', () => {
  it('BC2: edge cross starts panphase without immediate focus remap', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: 0.05,
      currentboard: 'board-a',
    }
    const snapped = stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    expect(snapped).toBe(false)
    expect(userdata.panphase).toBe(true)
    expect(userdata.focusx).toBeGreaterThan(BOARD_WIDTH - 2)
    expect(userdata.focusx).toBeLessThan(BOARD_WIDTH)
    expect(userdata.focussmooth).toBeGreaterThan(1)
    expect(userdata.pantargetx).toBe(BOARD_WIDTH)
  })

  it('BC2: non-edge board change does not start panphase', () => {
    const userdata: FocusUserData = {
      focusx: 20,
      focusy: 10,
      lfocusx: 20,
      lfocusy: 10,
      focussmooth: 0.05,
      currentboard: 'board-a',
    }
    const snapped = stepfocuswithboardtransition(
      userdata,
      { focusx: 5, focusy: 10 },
      'board-b',
      5,
      10,
      0.016,
    )
    expect(snapped).toBe(false)
    expect(userdata.panphase).toBeFalsy()
  })

  it('BC3: sprite snaps on edge-sized jump (separate from camera pan)', () => {
    const snap = spriteshouldsnapposition(
      false,
      false,
      -(BOARD_WIDTH - 1),
      0,
    )
    expect(snap).toBe(true)
  })
})
