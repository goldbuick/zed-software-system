/**
 * ZZT / RoZZT CGA attribute color byte ↔ cafe COLOR.
 *
 * Layout: bits 0-3 foreground (0-15), bits 4-6 background (0-7), bit 7 blink.
 * Blink maps to cafe COLOR.BLBLACK…BLWHITE.
 */

import { COLOR } from 'zss/words/types'

/** Decode a ZZT tile/stat color byte into cafe fg + bg. */
export function zztcolorfrombyte(zcolor: number): {
  color: COLOR
  bg: COLOR
} {
  const attr = zcolor & 0xff
  const fgn = attr & 0x0f
  const bgn = (attr >> 4) & 0x07
  const blink = (attr & 0x80) !== 0
  return {
    color: blink ? COLOR.BLBLACK + fgn : fgn,
    bg: bgn,
  }
}

/** Encode cafe fg/bg into a ZZT attribute color byte. */
export function zztcolorbyte(fg: number, bg: number): number {
  let blink = 0
  let fgn = fg & 0x0f
  if (fg >= COLOR.BLBLACK && fg <= COLOR.BLWHITE) {
    blink = 0x80
    fgn = fg - COLOR.BLBLACK
  }
  const bgn = bg & 0x07
  return fgn | (bgn << 4) | blink
}
