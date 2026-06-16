import { ZNS_VGA_FONT_DATA_URI } from './generated/zns-vga-font.js'
import { buildznsdotbkgcss } from './zns-dotbkg.js'
import { zedtaperowshtml } from './zns-zedhtml.js'

const ZNS_VGA_FONT = "'IBM EGA 8x14'"
const ZNS_FONT_SIZE = 14
const ZNS_CELL_W = 8
const ZNS_CELL_H = 14
const ZNS_DISPLAY_SCALE = 2
const ZNS_NARROW_MAX_PX = 640
const ZNS_DISPLAY_FONT_SIZE = ZNS_FONT_SIZE * ZNS_DISPLAY_SCALE
const ZNS_DISPLAY_LINE_HEIGHT = ZNS_CELL_H * ZNS_DISPLAY_SCALE

function buildstyles() {
  return `@font-face {
  font-family: 'IBM EGA 8x14';
  src: url('${ZNS_VGA_FONT_DATA_URI}') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
html, body { min-height: 100%; }
body.zns-page {
  margin: 0;
  padding: 16px;
  --zns-dot-w: ${ZNS_CELL_W * ZNS_DISPLAY_SCALE}px;
  --zns-dot-h: ${ZNS_CELL_H * ZNS_DISPLAY_SCALE}px;
  background: transparent;
  color: #FFFFFF;
  box-sizing: border-box;
  font-family: ${ZNS_VGA_FONT};
  font-size: ${ZNS_FONT_SIZE}px;
  line-height: ${ZNS_CELL_H}px;
}
.zns-vga-root {
  --zns-fs: ${ZNS_DISPLAY_FONT_SIZE}px;
  --zns-lh: ${ZNS_DISPLAY_LINE_HEIGHT}px;
  font-size: var(--zns-fs);
  line-height: var(--zns-lh);
  width: max-content;
  max-width: 100%;
  box-sizing: border-box;
}
@media screen and (max-width: ${ZNS_NARROW_MAX_PX}px) {
  body.zns-page {
    padding: 8px;
    --zns-dot-w: ${ZNS_CELL_W}px;
    --zns-dot-h: ${ZNS_CELL_H}px;
  }
  .zns-vga-root {
    --zns-fs: ${ZNS_FONT_SIZE}px;
    --zns-lh: ${ZNS_CELL_H}px;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .zns-line {
    overflow-x: auto;
    overflow-y: hidden;
  }
}
.zns-line {
  margin: 0;
  padding: 0;
  height: var(--zns-lh);
  line-height: var(--zns-lh);
  display: block;
  white-space: pre;
  font-family: ${ZNS_VGA_FONT};
  font-size: inherit;
}
.zns-tape { margin: 0; }
.zns-panel { margin-bottom: calc(var(--zns-lh) * 2); }
${buildznsdotbkgcss()}`
}

export function buildznsgridpreviewhtml({ calibrationtape, fidelitytape }) {
  const cal = zedtaperowshtml(calibrationtape)
  const fid = zedtaperowshtml(fidelitytape)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<title>ZNS VGA grid preview</title>
<style>${buildstyles()}</style>
</head>
<body class="zns-page">
<div class="zns-dotbkg" aria-hidden="true"><div class="zns-dotbkg-inner"></div></div>
<div class="zns-vga-root">
<section class="zns-panel">
<h1 style="font-size:inherit;font-weight:normal;margin:0 0 var(--zns-lh)">Calibration tape</h1>
<div class="zns-tape">${cal}</div>
</section>
<section class="zns-panel">
<h1 style="font-size:inherit;font-weight:normal;margin:0 0 var(--zns-lh)">Fidelity sample</h1>
<div class="zns-tape">${fid}</div>
</section>
</div>
</body>
</html>`
}
