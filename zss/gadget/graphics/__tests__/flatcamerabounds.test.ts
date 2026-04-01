import {
  flatcameradevassertboardinortho,
  flatcameratargetfocus,
  flatcameraworldboardextentsfromcorner,
} from 'zss/gadget/graphics/flatcamerabounds'

describe('flatcamerabounds', () => {
  const BOARD_W = 60
  const BOARD_H = 25

  describe('flatcameratargetfocus — numeric half-viewport in cells (leftedge)', () => {
    it('viewscale=1, dw=8, vw=80 → leftedge=5 (hand check: half view 40px / 8px = 5 cells)', () => {
      const viewscale = 1
      const drawwidth = 8
      const drawheight = 16
      const viewwidth = 80
      const viewheight = 400
      const { tfocusx } = flatcameratargetfocus({
        viewwidth,
        viewheight,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 100,
        controlfocusy: 12,
      })
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      expect(leftedge).toBe(5)
      const rightedge = BOARD_W - leftedge
      expect(tfocusx).toBe(rightedge + 0.25)
    })

    it('viewscale=2 doubles effective zoom → half-width in cells halves (leftedge=2.5)', () => {
      const drawwidth = 8
      const viewwidth = 80
      const viewscale = 2
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      expect(leftedge).toBe(2.5)
      const { tfocusx } = flatcameratargetfocus({
        viewwidth,
        viewheight: 400,
        drawwidth,
        drawheight: 16,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 100,
        controlfocusy: 0,
      })
      expect(tfocusx).toBe(BOARD_W - leftedge + 0.25)
    })

    it('when scaled board is narrower than view, pins focus to board center', () => {
      const drawwidth = 8
      const drawheight = 16
      const boarddrawwidth = BOARD_W * drawwidth
      const viewscale = 0.5
      const viewwidth = boarddrawwidth * viewscale + 100
      const { tfocusx, tfocusy } = flatcameratargetfocus({
        viewwidth,
        viewheight: 800,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 3,
        controlfocusy: 7,
      })
      expect(tfocusx).toBe(BOARD_W * 0.5)
      expect(tfocusy).toBe(BOARD_H * 0.5)
    })
  })

  describe('flatcameratargetfocus — clamp respects slack constants', () => {
    it('clamps controlfocusx into [leftedge-1, rightedge+0.25]', () => {
      const drawwidth = 8
      const drawheight = 16
      const viewwidth = 80
      const viewscale = 1
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      const rightedge = BOARD_W - leftedge
      const { tfocusx } = flatcameratargetfocus({
        viewwidth,
        viewheight: 400,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 0,
        controlfocusy: 0,
      })
      expect(tfocusx).toBe(leftedge - 1)
      const hi = flatcameratargetfocus({
        viewwidth,
        viewheight: 400,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 99,
        controlfocusy: 0,
      })
      expect(hi.tfocusx).toBe(rightedge + 0.25)
    })

    it('Y uses topedge-1 .. bottomedge (no +0.25 on max)', () => {
      const drawwidth = 8
      const drawheight = 10
      const viewheight = 100
      const viewscale = 1
      const topedge = (viewheight * 0.5) / (drawheight * viewscale)
      const bottomedge = BOARD_H - topedge
      const lo = flatcameratargetfocus({
        viewwidth: 200,
        viewheight,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 30,
        controlfocusy: 0,
      })
      expect(lo.tfocusy).toBe(topedge - 1)
      const hi = flatcameratargetfocus({
        viewwidth: 200,
        viewheight,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 30,
        controlfocusy: 99,
      })
      expect(hi.tfocusy).toBe(bottomedge)
    })
  })

  describe('flatcameratargetfocus — optional edge padding', () => {
    it('padbottom lowers max tfocusy vs unpadded', () => {
      const drawwidth = 8
      const drawheight = 10
      const viewheight = 100
      const viewscale = 1
      const halfh = viewheight * 0.5
      const padbottom = 10
      const unpadded = flatcameratargetfocus({
        viewwidth: 200,
        viewheight,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 30,
        controlfocusy: 99,
      })
      const padded = flatcameratargetfocus({
        viewwidth: 200,
        viewheight,
        drawwidth,
        drawheight,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 30,
        controlfocusy: 99,
        padbottom,
      })
      const expectedbottom = BOARD_H - (halfh + padbottom) / (drawheight * viewscale)
      expect(padded.tfocusy).toBe(expectedbottom)
      expect(padded.tfocusy).toBeLessThan(unpadded.tfocusy)
    })

    it('padleft raises min tfocusx vs unpadded', () => {
      const drawwidth = 8
      const viewwidth = 80
      const viewscale = 1
      const padleft = 8
      const unpadded = flatcameratargetfocus({
        viewwidth,
        viewheight: 400,
        drawwidth,
        drawheight: 16,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 0,
        controlfocusy: 12,
      })
      const padded = flatcameratargetfocus({
        viewwidth,
        viewheight: 400,
        drawwidth,
        drawheight: 16,
        viewscale,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        controlfocusx: 0,
        controlfocusy: 12,
        padleft,
      })
      const leftedgepadded =
        (viewwidth * 0.5 + padleft) / (drawwidth * viewscale)
      expect(padded.tfocusx).toBe(leftedgepadded - 1)
      expect(padded.tfocusx).toBeGreaterThan(unpadded.tfocusx)
    })
  })

  describe('flatcameraworldboardextentsfromcorner — settled pan matches frustum at clamp extremes', () => {
    it('at min tfocusx with centerx=0, board left edge sits near -vw/2', () => {
      const drawwidth = 8
      const viewwidth = 80
      const viewscale = 1
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      const minfocusx = leftedge - 1
      const fx = (minfocusx + 0.5) * drawwidth
      const cornerx = -fx
      const { minworldx } = flatcameraworldboardextentsfromcorner({
        centerx: 0,
        centery: 0,
        viewscale,
        cornerx,
        cornery: 0,
        drawwidth,
        drawheight: 16,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
      })
      // leftedge - 1 slack: min world x is -vw/2 + 0.5×cell width (not exactly -vw/2)
      expect(minworldx).toBeCloseTo(
        -viewwidth * 0.5 + 0.5 * drawwidth * viewscale,
        5,
      )
    })

    it('at max tfocusx with centerx=0, board right edge within +vw/2 slack from X fudge', () => {
      const drawwidth = 8
      const viewwidth = 80
      const viewscale = 1
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      const rightedge = BOARD_W - leftedge
      const maxfocusx = rightedge + 0.25
      const fx = (maxfocusx + 0.5) * drawwidth
      const cornerx = -fx
      const { maxworldx } = flatcameraworldboardextentsfromcorner({
        centerx: 0,
        centery: 0,
        viewscale,
        cornerx,
        cornery: 0,
        drawwidth,
        drawheight: 16,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
      })
      expect(maxworldx).toBeLessThanOrEqual(viewwidth * 0.5 + 1e-3)
    })
  })

  describe('flatcameradevassertboardinortho', () => {
    it('skips axes when view is larger than scaled board (letterboxing)', () => {
      const drawwidth = 8
      const drawheight = 16
      const boarddraww = BOARD_W * drawwidth
      const boarddrawh = BOARD_H * drawheight
      const viewwidth = boarddraww + 32
      const viewheight = boarddrawh + 32
      const viewscale = 1
      const focusx = BOARD_W * 0.5
      const focusy = BOARD_H * 0.5
      const fx = (focusx + 0.5) * drawwidth
      const fy = (focusy + 0.5) * drawheight
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const ok = flatcameradevassertboardinortho({
        centerx: 0,
        centery: 0,
        viewscale,
        cornerx: -fx,
        cornery: -fy,
        drawwidth,
        drawheight,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        viewwidth,
        viewheight,
        cellepsilon: drawwidth * viewscale,
        checkhoriz: false,
        checkvert: false,
      })
      expect(ok).toBe(true)
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('checks horiz when view crops board; min tfocusx passes void invariant', () => {
      const drawwidth = 8
      const drawheight = 16
      const viewwidth = 80
      const viewheight = 450
      const viewscale = 1
      const leftedge = (viewwidth * 0.5) / (drawwidth * viewscale)
      const minfocusx = leftedge - 1
      const fx = (minfocusx + 0.5) * drawwidth
      const focusy = BOARD_H * 0.5
      const fy = (focusy + 0.5) * drawheight
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const boardwscaled = BOARD_W * drawwidth * viewscale
      const boardhscaled = BOARD_H * drawheight * viewscale
      const ok = flatcameradevassertboardinortho({
        centerx: 0,
        centery: 0,
        viewscale,
        cornerx: -fx,
        cornery: -fy,
        drawwidth,
        drawheight,
        boardwidth: BOARD_W,
        boardheight: BOARD_H,
        viewwidth,
        viewheight,
        cellepsilon: drawwidth * viewscale,
        checkhoriz: viewwidth <= boardwscaled,
        checkvert: viewheight <= boardhscaled,
      })
      expect(ok).toBe(true)
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
