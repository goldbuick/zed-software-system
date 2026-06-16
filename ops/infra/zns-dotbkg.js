/**
 * ZNS page dot grid — mirrors zss/screens/tape/backplate.tsx:
 *   tile bg = bgcolor() → $ondkblue (#0000aa, classic terminal blue)
 *   dot fg = FG → $blue (#5555ff)
 *   checkerboard: dots on (x+y)%2===0 cells (· / ∙ variants)
 */
import { fghex, resolvebgindex, resolvefgindex } from './zns-palette.js'

export const ZNS_DOT_BG = fghex(resolvebgindex('ondkblue'))
export const ZNS_DOT_FG = fghex(resolvefgindex('blue'))

export const ZNS_DOT_EMAIL_TILE_W = 8
export const ZNS_DOT_EMAIL_TILE_H = 8

function checkerboardgridimage() {
  return [
    `radial-gradient(circle at 1px 1px, ${ZNS_DOT_FG} 1px, transparent 1px)`,
    `radial-gradient(circle at 9px 15px, ${ZNS_DOT_FG} 0.85px, transparent 1px)`,
  ].join(',')
}

export function buildznsdotbkgsvgpattern() {
  return `<pattern id="zns-dot-pattern" width="${ZNS_DOT_EMAIL_TILE_W}" height="${ZNS_DOT_EMAIL_TILE_H}" patternUnits="userSpaceOnUse">
  <rect width="100%" height="100%" fill="${ZNS_DOT_BG}"/>
  <circle cx="1" cy="1" r="1" fill="${ZNS_DOT_FG}" opacity="0.85"/>
</pattern>`
}

export function buildznsdotbkgsvgtile() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ZNS_DOT_EMAIL_TILE_W}" height="${ZNS_DOT_EMAIL_TILE_H}">${buildznsdotbkgsvgpattern()}<rect width="100%" height="100%" fill="url(#zns-dot-pattern)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Dot grid on body.zns-page (scrolls with content; not position:fixed).
 * CSS vars --zns-dot-w / --zns-dot-h = one cell (8×14 native, 16×28 at 2×).
 * Pattern tile = 2×2 cells for TapeBackPlate checkerboard parity.
 */
export function buildznsdotbkgcss() {
  const grid = checkerboardgridimage()
  return `body.zns-page{
  background-color:${ZNS_DOT_BG};
  background-image:${grid};
  background-size:calc(var(--zns-dot-w, 8px) * 2) calc(var(--zns-dot-h, 14px) * 2);
  background-position:0 0;
  background-repeat:repeat;
}
body.zns-page .zns-vga-root{
  position:relative;
}`
}

export function buildznsdotbkgscript() {
  return ''
}
