export const ZNS_DOT_BG = '#00002a'
export const ZNS_DOT_EMAIL_TILE_W = 8
export const ZNS_DOT_EMAIL_TILE_H = 8

export function buildznsdotbkgsvgpattern() {
  return `<pattern id="zns-dot-pattern" width="${ZNS_DOT_EMAIL_TILE_W}" height="${ZNS_DOT_EMAIL_TILE_H}" patternUnits="userSpaceOnUse">
  <rect width="100%" height="100%" fill="${ZNS_DOT_BG}"/>
  <circle cx="2" cy="2" r="1" fill="#000055" opacity="0.55"/>
</pattern>`
}

export function buildznsdotbkgsvgtile() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ZNS_DOT_EMAIL_TILE_W}" height="${ZNS_DOT_EMAIL_TILE_H}">${buildznsdotbkgsvgpattern()}<rect width="100%" height="100%" fill="url(#zns-dot-pattern)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function buildznsdotbkgcss() {
  return `.zns-dotbkg{position:fixed;inset:0;pointer-events:none;z-index:0;}
.zns-dotbkg-inner{width:100%;height:100%;background-color:${ZNS_DOT_BG};background-image:url("${buildznsdotbkgsvgtile()}");background-size:${ZNS_DOT_EMAIL_TILE_W}px ${ZNS_DOT_EMAIL_TILE_H}px;background-repeat:repeat;}
body.zns-page .zns-vga-root{position:relative;z-index:1;}`
}

export function buildznsdotbkgscript() {
  return ''
}
