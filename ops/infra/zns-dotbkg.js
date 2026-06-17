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

/** Native 2×2 cell tile (16×28) before CSS scale vars. */
const ZNS_DOT_CHECKER_W = 16
const ZNS_DOT_CHECKER_H = 28

function buildznsdotcheckerboardsvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ZNS_DOT_CHECKER_W}" height="${ZNS_DOT_CHECKER_H}" viewBox="0 0 ${ZNS_DOT_CHECKER_W} ${ZNS_DOT_CHECKER_H}">
<rect width="100%" height="100%" fill="${ZNS_DOT_BG}"/>
<circle cx="1" cy="1" r="1" fill="${ZNS_DOT_FG}" opacity="0.85"/>
<circle cx="9" cy="15" r="0.85" fill="${ZNS_DOT_FG}" opacity="0.85"/>
</svg>`
}

export function buildznsdotbkgimageuri() {
  return `url("data:image/svg+xml,${encodeURIComponent(buildznsdotcheckerboardsvg())}")`
}

/** Checkerboard dot tile for email SVG (matches web 2×2 cell pattern). */
export function buildznsdotbkgemailpattern() {
  return `<pattern id="zns-dot-pattern" width="${ZNS_DOT_CHECKER_W}" height="${ZNS_DOT_CHECKER_H}" patternUnits="userSpaceOnUse">
  <rect width="100%" height="100%" fill="${ZNS_DOT_BG}"/>
  <circle cx="1" cy="1" r="1" fill="${ZNS_DOT_FG}" opacity="0.85"/>
  <circle cx="9" cy="15" r="0.85" fill="${ZNS_DOT_FG}" opacity="0.85"/>
</pattern>`
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
 * Dot grid on body.zns-page (scrolls with content; SVG scales at 2× desktop).
 * CSS vars --zns-dot-w / --zns-dot-h = one cell (8×14 native, 16×28 at 2×).
 */
export function buildznsdotbkgcss() {
  const image = buildznsdotbkgimageuri()
  return `body.zns-page{
  background-color:${ZNS_DOT_BG};
  background-image:${image};
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
