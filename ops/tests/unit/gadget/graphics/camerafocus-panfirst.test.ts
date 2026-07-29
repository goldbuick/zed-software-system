import {
  type FocusUserData,
  FOCUS_ANIM_RATE,
  isfocuspanphase,
  liveboardworldoffset,
  readboardgrid,
  readgridbias,
  stepfocuswithboardtransition,
  worldcellfromlocal,
} from 'zss/gadget/graphics/camerafocus'
import { buildexitpreviewgroups } from 'zss/gadget/graphics/exitpreviewgroups'
import {
  biasfrompendingboardchange,
  PANVIEW_IDLE,
  readboardgridforrender,
  resolvepanviewforrender,
  setdofplayerworld,
} from 'zss/gadget/graphics/panviewsync'
import type { LAYER } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { Group, Vector3 } from 'three'

describe('global board space camerafocus', () => {
  it('bumps boardgridx on east exit and keeps focus continuous', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
      boardgridx: 0,
      boardgridy: 0,
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
    expect(readboardgrid(userdata)).toEqual({ x: 1, y: 0 })
    expect(readgridbias(userdata)).toEqual({ dx: 1, dy: 0 })
    // Focus stays near prior world cell (no -BOARD remap)
    expect(userdata.focusx).toBeGreaterThan(BOARD_WIDTH - 2)
    expect(userdata.focusx).toBeLessThan(BOARD_WIDTH)
    expect(userdata.pantargetx).toBe(BOARD_WIDTH)
    expect(userdata.focussmooth).toBeGreaterThan(1)
  })

  it('settle clears panphase only -- focus stays in world space', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
      boardgridx: 0,
      boardgridy: 0,
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
    expect(isfocuspanphase(userdata)).toBe(false)
    expect(readgridbias(userdata)).toEqual({ dx: 0, dy: 0 })
    expect(readboardgrid(userdata)).toEqual({ x: 1, y: 0 })
    // No remap: focus remains at world pantarget
    expect(userdata.focusx).toBe(BOARD_WIDTH)
  })

  it('resets grid and teleports focus on non-edge board change', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH + 5,
      focusy: 10,
      lfocusx: 20,
      lfocusy: 10,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
      boardgridx: 2,
      boardgridy: 1,
    }
    stepfocuswithboardtransition(
      userdata,
      { focusx: 5, focusy: 10 },
      'board-b',
      5,
      10,
      0.016,
    )
    expect(isfocuspanphase(userdata)).toBe(false)
    expect(readboardgrid(userdata)).toEqual({ x: 0, y: 0 })
    expect(userdata.focusx).toBe(5)
    expect(userdata.focusy).toBe(10)
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
      boardgridx: 0,
      boardgridy: 0,
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

  it('north exit freezes lagged focusx and bumps boardgridy', () => {
    const laggedx = 4.3
    const userdata: FocusUserData = {
      focusx: laggedx,
      focusy: 0,
      lfocusx: 5,
      lfocusy: 0,
      focussmooth: FOCUS_ANIM_RATE,
      currentboard: 'board-a',
      boardgridx: 0,
      boardgridy: 0,
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
    expect(readboardgrid(userdata)).toEqual({ x: 0, y: -1 })
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

  it('worldcellfromlocal and liveboardworldoffset match grid slots', () => {
    expect(worldcellfromlocal(2, -1, 3, 4)).toEqual({
      x: 2 * BOARD_WIDTH + 3,
      y: -1 * BOARD_HEIGHT + 4,
    })
    const userdata: FocusUserData = { boardgridx: 1, boardgridy: 0 }
    expect(liveboardworldoffset(userdata, 8, 14)).toEqual({
      x: BOARD_WIDTH * 8,
      y: 0,
    })
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

  it('pending board change advances render grid before useFrame bump', () => {
    const userdata: FocusUserData = {
      currentboard: 'c',
      exitsnap: snap,
      panphase: false,
      boardgridx: 0,
      boardgridy: 0,
    }
    expect(readboardgridforrender(userdata, 'e')).toEqual({ x: 1, y: 0 })
  })

  it('setdofplayerworld transforms local cell through liveboard offset', () => {
    const live = new Group()
    live.position.set(BOARD_WIDTH * 8, 0, 0)
    live.updateMatrixWorld(true)
    const out = new Vector3()
    expect(setdofplayerworld(out, live, 0, 0, 8, 14, 5)).toBe(true)
    expect(out.x).toBeCloseTo(BOARD_WIDTH * 8 + 4)
    expect(out.y).toBeCloseTo(7)
    expect(out.z).toBeCloseTo(5)
    expect(setdofplayerworld(out, null, 0, 0, 8, 14, 0)).toBe(false)
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

describe('buildexitpreviewgroups world slots', () => {
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

  it('places neighbors relative to boardgridx', () => {
    const groups = buildexitpreviewgroups(
      gadgetbase(),
      emptycache,
      drawwidth,
      drawheight,
      { boardgridx: 1, boardgridy: 0 },
    )
    const e = groups.find((g) => g.key === 'e')
    const w = groups.find((g) => g.key === 'w')
    expect(e?.position[0]).toBe(2 * BOARD_WIDTH * drawwidth)
    expect(w?.position[0]).toBe(0)
  })

  it('places e2 at gx+2 only while panphase', () => {
    const steady = buildexitpreviewgroups(
      gadgetbase(),
      emptycache,
      drawwidth,
      drawheight,
      { boardgridx: 1, boardgridy: 0, bias: { dx: 1, dy: 0 } },
    )
    expect(steady.find((g) => g.key === 'e2')).toBeUndefined()

    const panning = buildexitpreviewgroups(
      gadgetbase(),
      emptycache,
      drawwidth,
      drawheight,
      {
        boardgridx: 1,
        boardgridy: 0,
        bias: { dx: 1, dy: 0 },
        panphase: true,
      },
    )
    const e2 = panning.find((g) => g.key === 'e2')
    expect(e2?.position[0]).toBe(3 * BOARD_WIDTH * drawwidth)
  })
})

describe('boundary coord evidence (global board space)', () => {
  it('BC2: edge cross bumps grid without focus remap', () => {
    const userdata: FocusUserData = {
      focusx: BOARD_WIDTH - 1,
      focusy: 10,
      lfocusx: BOARD_WIDTH - 1,
      lfocusy: 10,
      focussmooth: 0.05,
      currentboard: 'board-a',
      boardgridx: 0,
      boardgridy: 0,
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
    expect(userdata.boardgridx).toBe(1)
    expect(userdata.focusx).toBeGreaterThan(BOARD_WIDTH - 2)
    expect(userdata.focusx).toBeLessThan(BOARD_WIDTH)
  })

  it('BC2: non-edge board change does not start panphase', () => {
    const userdata: FocusUserData = {
      focusx: 20,
      focusy: 10,
      lfocusx: 20,
      lfocusy: 10,
      focussmooth: 0.05,
      currentboard: 'board-a',
      boardgridx: 0,
      boardgridy: 0,
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
      boardgridx: 0,
      boardgridy: 0,
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
    expect(readboardgrid(userdata)).toEqual({ x: 0, y: -1 })
  })
})
