import {
  type FocusUserData,
  FOCUS_ANIM_RATE,
  applypanrecenter,
  isfocuspanphase,
  ispanrecenterpending,
  readgridbias,
  shiftcornerforpanrecenter,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import {
  buildexitpreviewgroups,
  type ExitPreviewBuildOpts,
} from 'zss/gadget/graphics/exitpreviewgroups'
import {
  biasfrompendingboardchange,
  PANVIEW_IDLE,
  resolvepanviewforrender,
} from 'zss/gadget/graphics/panviewsync'
import type { LAYER } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('pan-first camerafocus', () => {
  it('starts panphase without immediate ±board focus snap on edge exit', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
    }
    const cornersnap = stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    expect(cornersnap).toBe(false)
    expect(isfocuspanphase(userdata)).toBe(true)
    expect(readgridbias(userdata)).toEqual({ dx: 1, dy: 0 })
    // Departure-frame focus kept (no immediate focus += -BOARD_WIDTH)
    expect(userdata.focusx).toBeGreaterThan(BOARD_WIDTH - 2)
    expect(userdata.focusx).toBeLessThan(BOARD_WIDTH)
    expect(userdata.focussmooth).toBeGreaterThan(1)
    expect(userdata.pantargetx).toBe(BOARD_WIDTH)
  })

  it('recenters and clears bias after pan settles', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
    }
    stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    // Jump near target to force settle on next step
    userdata.focusx = userdata.pantargetx
    userdata.focusy = userdata.pantargety
    userdata.focussmooth = FOCUS_ANIM_RATE
    const cornersnap = stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    expect(cornersnap).toBe(false)
    expect(isfocuspanphase(userdata)).toBe(false)
    expect(ispanrecenterpending(userdata)).toBe(true)
    // Focus still in departure frame until layout applypanrecenter
    expect(userdata.focusx).toBe(BOARD_WIDTH)
    expect(readgridbias(userdata)).toEqual({ dx: 0, dy: 0 })
    expect(applypanrecenter(userdata)).toEqual({ dx: 1, dy: 0 })
    expect(userdata.focusx).toBe(0)
    expect(ispanrecenterpending(userdata)).toBe(false)
  })

  it('does not start panphase on non-edge board change', () => {
    const userdata: FocusUserData = {
      focusx: 20,
      focusy: 10,
      lfocusx: 20,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
    }
    const cornersnap = stepfocuswithboardtransition(
      userdata,
      { focusx: 5, focusy: 10 },
      'board-b',
      5,
      10,
      0.016,
    )
    expect(cornersnap).toBe(false)
    expect(isfocuspanphase(userdata)).toBe(false)
    expect(readgridbias(userdata)).toEqual({ dx: 0, dy: 0 })
  })

  it('east exit freezes lagged focusy (no diagonal toward control Y)', () => {
    const laggedy = 9.2
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: laggedy,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
    }
    stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    expect(isfocuspanphase(userdata)).toBe(true)
    expect(userdata.pantargety).toBe(laggedy)
    expect(userdata.pantargetx).toBe(BOARD_WIDTH)
    for (let i = 0; i < 8; ++i) {
      stepfocuswithboardtransition(
        userdata,
        { focusx: 0, focusy: 10 },
        'board-b',
        0,
        10,
        0.016,
      )
    }
    expect(userdata.focusy).toBe(laggedy)
    expect(userdata.focusx).toBeGreaterThan(BOARD_WIDTH - 1)
  })

  it('north exit freezes lagged focusx (no diagonal toward control X)', () => {
    const laggedx = 4.3
    const userdata: FocusUserData = {
      focusx: laggedx,
      focusy: 0,
      lfocusx: 5,
      lfocusy: 0,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
    }
    stepfocuswithboardtransition(
      userdata,
      { focusx: 5, focusy: BOARD_HEIGHT - 1 },
      'board-n',
      5,
      BOARD_HEIGHT - 1,
      0.016,
    )
    expect(isfocuspanphase(userdata)).toBe(true)
    expect(userdata.pantargetx).toBe(laggedx)
    expect(readgridbias(userdata)).toEqual({ dx: 0, dy: -1 })
    for (let i = 0; i < 8; ++i) {
      stepfocuswithboardtransition(
        userdata,
        { focusx: 5, focusy: BOARD_HEIGHT - 1 },
        'board-n',
        5,
        BOARD_HEIGHT - 1,
        0.016,
      )
    }
    expect(userdata.focusx).toBe(laggedx)
  })

  it('holds focus across frames until applypanrecenter after settle', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
    }
    stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    userdata.focusx = userdata.pantargetx
    userdata.focusy = userdata.pantargety
    userdata.focussmooth = FOCUS_ANIM_RATE
    stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    const before = userdata.focusx
    expect(before).toBe(BOARD_WIDTH)
    stepfocuswithboardtransition(
      userdata,
      { focusx: 0, focusy: 10 },
      'board-b',
      0,
      10,
      0.016,
    )
    expect(userdata.focusx).toBe(before)
    applypanrecenter(userdata)
    expect(userdata.focusx).toBe(0)
  })

  it('shiftcornerforpanrecenter preserves lag via board delta', () => {
    const corner = { x: 100, y: 50 }
    shiftcornerforpanrecenter(corner, { dx: 1, dy: 0 }, 8, 14)
    expect(corner.x).toBe(100 + BOARD_WIDTH * 8)
    expect(corner.y).toBe(50)
    shiftcornerforpanrecenter(corner, { dx: 0, dy: -1 }, 8, 14)
    expect(corner.y).toBe(50 - BOARD_HEIGHT * 14)
  })
})

describe('panviewsync coherence', () => {
  const snap = {
    board: 'c',
    exiteast: 'e',
    exitwest: 'w',
    exitnorth: 'n',
    exitsouth: 's',
    exiteast2: 'ee',
    exitwest2: 'ww',
    exitnorth2: 'nn',
    exitsouth2: 'ss',
    exitne: '',
    exitnw: '',
    exitse: '',
    exitsw: '',
  }

  it('infers east bias when gadget board advances before useFrame pan', () => {
    const userdata: FocusUserData = {
      currentboard: 'c',
      exitsnap: snap,
      panphase: false,
    }
    expect(biasfrompendingboardchange(snap, 'e', userdata)).toEqual({
      dx: 1,
      dy: 0,
    })
  })

  it('does not infer pending bias for non-cardinal board change', () => {
    const userdata: FocusUserData = {
      currentboard: 'c',
      exitsnap: snap,
      panphase: false,
    }
    expect(biasfrompendingboardchange(snap, 'other', userdata)).toBeNull()
  })

  it('keeps committed panview after settle clears userdata (no void frame)', () => {
    const userdata: FocusUserData = {
      currentboard: 'e',
      exitsnap: snap,
      panphase: false,
      gridbiasdx: 0,
      gridbiasdy: 0,
    }
    const committed = {
      panphase: true,
      biasdx: 1 as const,
      biasdy: 0 as const,
    }
    expect(resolvepanviewforrender(committed, userdata, 'e')).toEqual(
      committed,
    )
  })

  it('uses pending bias on board-change render before panphase starts', () => {
    const userdata: FocusUserData = {
      currentboard: 'c',
      exitsnap: snap,
      panphase: false,
    }
    expect(resolvepanviewforrender(PANVIEW_IDLE, userdata, 'e')).toEqual({
      panphase: true,
      biasdx: 1,
      biasdy: 0,
    })
  })

  it('prefers active userdata pan over idle committed during enter', () => {
    const userdata: FocusUserData = {
      currentboard: 'e',
      exitsnap: snap,
      panphase: true,
      gridbiasdx: 1,
      gridbiasdy: 0,
    }
    expect(resolvepanviewforrender(PANVIEW_IDLE, userdata, 'e')).toEqual({
      panphase: true,
      biasdx: 1,
      biasdy: 0,
    })
  })
})

describe('buildexitpreviewgroups depth-2', () => {
  const emptycache = new Map<string, LAYER[]>()
  const drawwidth = 1
  const drawheight = 1

  function gadgetbase() {
    return {
      exiteast: 'e',
      exitwest: 'w',
      exitnorth: 'n',
      exitsouth: 's',
      exiteast2: 'ee',
      exitwest2: 'ww',
      exitnorth2: 'nn',
      exitsouth2: 'ss',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      under: [] as LAYER[],
    }
  }

  it('places e2 at 2W when bias east in steady mode', () => {
    const groups = buildexitpreviewgroups(
      gadgetbase(),
      emptycache,
      drawwidth,
      drawheight,
      { bias: { dx: 1, dy: 0 } },
    )
    const e2 = groups.find((g) => g.key === 'e2')
    expect(e2).toBeDefined()
    expect(e2?.position[0]).toBe(2 * BOARD_WIDTH * drawwidth)
  })

  it('panphase departure window places depth-2 ahead and skips live slot', () => {
    const opts: ExitPreviewBuildOpts = {
      bias: { dx: 1, dy: 0 },
      panphase: true,
      skipliveboardpreview: true,
      exitsnap: {
        board: 'c',
        exiteast: 'e',
        exitwest: 'w',
        exitnorth: 'n',
        exitsouth: 's',
        exiteast2: 'ee',
        exitwest2: 'ww',
        exitnorth2: 'nn',
        exitsouth2: 'ss',
        exitne: '',
        exitnw: '',
        exitse: '',
        exitsw: '',
      },
    }
    const groups = buildexitpreviewgroups(
      gadgetbase(),
      emptycache,
      drawwidth,
      drawheight,
      opts,
    )
    expect(groups.find((g) => g.key === 'e')).toBeUndefined()
    expect(groups.find((g) => g.key === 'c')).toBeDefined()
    const e2 = groups.find((g) => g.key === 'e2')
    expect(e2?.position[0]).toBe(2 * BOARD_WIDTH * drawwidth)
    // During pan east, EE comes from current gadget.exiteast
    expect(e2?.preview).toBeDefined()
  })
})

describe('boundary coord evidence (pan-first)', () => {
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

  it('keeps BOARD_HEIGHT edge detection for north/south', () => {
    const userdata: FocusUserData = {
      focusx: 5,
      focusy: 0,
      lfocusx: 5,
      lfocusy: 0,
      focussmooth: 0.05,
      currentboard: 'board-a',
    }
    stepfocuswithboardtransition(
      userdata,
      { focusx: 5, focusy: BOARD_HEIGHT - 1 },
      'board-n',
      5,
      BOARD_HEIGHT - 1,
      0.016,
    )
    expect(userdata.panphase).toBe(true)
    expect(readgridbias(userdata)).toEqual({ dx: 0, dy: -1 })
  })
})
