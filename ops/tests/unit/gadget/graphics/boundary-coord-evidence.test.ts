/**
 * Evidence: camera edge glide vs sprite teleport snap (BC2/BC3).
 * Camera keeps the ±board offset glide; sprites snap on edge-sized jumps.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  type FocusUserData,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import { spriteshouldsnapposition } from 'zss/gadget/graphics/spritesboardsnap'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

const LOG = join(process.cwd(), '.cursor', 'debug-boundary-coord.log')

function evidencelog(payload: Record<string, unknown>) {
  mkdirSync(dirname(LOG), { recursive: true })
  try {
    writeFileSync(LOG, '')
  } catch {
    // ignore truncate races
  }
  appendFileSync(
    LOG,
    `${JSON.stringify({ ...payload, timestamp: Date.now() })}\n`,
  )
}

describe('boundary coord evidence (camera glide preserved)', () => {
  it('BC2: edge cross offsets focus by board size then glides', () => {
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
    evidencelog({
      scenario: 'BC2_edge_glide',
      hypothesis: 'BC2',
      snapped,
      focusx: userdata.focusx,
      focussmooth: userdata.focussmooth,
      verdict:
        snapped &&
        userdata.focusx === BOARD_WIDTH - 1 + -1 * BOARD_WIDTH &&
        userdata.focussmooth === 1.5
          ? 'GLIDE_OFFSET_OK'
          : 'REGRESSION',
    })
    expect(snapped).toBe(true)
    expect(userdata.focusx).toBe(BOARD_WIDTH - 1 - BOARD_WIDTH)
    expect(userdata.focussmooth).toBe(1.5)
  })

  it('BC2: non-edge board change does not start offset glide', () => {
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
    evidencelog({
      scenario: 'BC2_no_edge_offset',
      hypothesis: 'BC2',
      snapped,
      dx: 5 - 20,
      verdict: !snapped ? 'NO_OFFSET_for_mid_board_change' : 'UNEXPECTED',
    })
    expect(snapped).toBe(false)
  })

  it('BC3: sprite snaps on edge-sized jump (separate from camera glide)', () => {
    const snap = spriteshouldsnapposition(
      false,
      false,
      -(BOARD_WIDTH - 1),
      0,
    )
    evidencelog({
      scenario: 'BC3_sprite_edge_snap',
      hypothesis: 'BC3',
      snap,
      verdict: snap ? 'SPRITE_SNAP_OK' : 'REGRESSION',
    })
    expect(snap).toBe(true)
  })
})
