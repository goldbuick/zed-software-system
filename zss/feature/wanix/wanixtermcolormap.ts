import { COLOR } from 'zss/words/types'

const CM_MASK = 0x03000000
const CM_DEFAULT = 0
/** xterm.js CM_P16 — 16-color ANSI palette */
const CM_P16 = 0x01000000
/** legacy combined encoding (same value as CM_P16) */
const CM_PALETTE = CM_P16
/** legacy combined encoding for rgb in old tests */
const CM_RGB = 0x02000000

const XTERM_PALETTE_FG: COLOR[] = [
  COLOR.BLACK,
  COLOR.RED,
  COLOR.GREEN,
  COLOR.YELLOW,
  COLOR.BLUE,
  COLOR.PURPLE,
  COLOR.CYAN,
  COLOR.LTGRAY,
  COLOR.DKGRAY,
  COLOR.RED,
  COLOR.GREEN,
  COLOR.YELLOW,
  COLOR.BLUE,
  COLOR.PURPLE,
  COLOR.CYAN,
  COLOR.WHITE,
]

const XTERM_PALETTE_BG: COLOR[] = [
  COLOR.BLACK,
  COLOR.DKRED,
  COLOR.DKGREEN,
  COLOR.DKYELLOW,
  COLOR.DKBLUE,
  COLOR.DKPURPLE,
  COLOR.DKCYAN,
  COLOR.LTGRAY,
  COLOR.DKGRAY,
  COLOR.RED,
  COLOR.GREEN,
  COLOR.YELLOW,
  COLOR.BLUE,
  COLOR.PURPLE,
  COLOR.CYAN,
  COLOR.WHITE,
]

function rgbtozss(rgb: number, isbg: boolean): COLOR {
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  const lum = (r * 299 + g * 587 + b * 114) / 1000
  if (lum < 32) {
    return COLOR.BLACK
  }
  if (lum < 96) {
    return isbg ? COLOR.DKGRAY : COLOR.DKGRAY
  }
  if (lum < 160) {
    return isbg ? COLOR.DKBLUE : COLOR.LTGRAY
  }
  if (lum < 220) {
    return isbg ? COLOR.DKBLUE : COLOR.WHITE
  }
  return COLOR.WHITE
}

function xtermpalettetozss(index: number, isbg: boolean): COLOR {
  const palette = isbg ? XTERM_PALETTE_BG : XTERM_PALETTE_FG
  return palette[index & 15] ?? (isbg ? COLOR.BLACK : COLOR.WHITE)
}

/** Map xterm.js getFgColorMode/getBgColorMode + raw color index. */
export function xtermcellcolortozss(
  mode: number,
  color: number,
  isbg: boolean,
): COLOR {
  if (mode === CM_DEFAULT) {
    return isbg ? COLOR.BLACK : COLOR.WHITE
  }
  if (mode === CM_P16) {
    return xtermpalettetozss(color, isbg)
  }
  // P256 / RGB deferred — fall back to default fg/bg
  return isbg ? COLOR.BLACK : COLOR.WHITE
}

/** Legacy combined encoding when mode bits are embedded in the color integer. */
export function xtermcolortozss(value: number, isbg: boolean): COLOR {
  const mode = value & CM_MASK
  if (mode === CM_DEFAULT) {
    return isbg ? COLOR.BLACK : COLOR.WHITE
  }
  if (mode === CM_PALETTE) {
    return xtermpalettetozss(value & 0xff, isbg)
  }
  if (mode === CM_RGB) {
    return rgbtozss(value & 0xffffff, isbg)
  }
  return isbg ? COLOR.BLACK : COLOR.WHITE
}
