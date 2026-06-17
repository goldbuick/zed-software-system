import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ZNS_VGA_FONT_DATA_URI } from '../../../ops/infra/generated/zns-vga-font.js'
import { buildznscodemeta, buildznscodeemailhtml, buildznsemailpalette } from '../../../ops/infra/zns-email-card.js'
import {
  buildznsemailcardpreviewhtml,
  buildznsemailcardsvg,
} from '../../../ops/infra/zns-email-card-svg.js'
import {
  initemailcardwasm,
  reademailcardfontbytes,
  renderemailcardpngwasmcore,
} from '../../../ops/infra/zns-email-card-png-wasm-core.js'
import { ZNS_DOT_BG } from '../../../ops/infra/zns-dotbkg.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const outdir = join(root, 'ops/infra/generated')
const code = '363412'
const email = 'whitlark@gmail.com'
const namespace = 'docs'
const joinorigin = 'https://zed.cafe'

const LEGACY_BAD = ['#153f15', '#3f3f3f', '#00002a', '#2a2a2a', '#15153f', '#3f3f15']

function assertok(condition, message) {
  if (!condition) {
    console.error(`assert failed: ${message}`)
    process.exit(1)
  }
}

mkdirSync(outdir, { recursive: true })

const meta = buildznscodemeta({ code, email, namespace, joinorigin })
const svg = buildznsemailcardsvg(
  {
    namespace: meta.namespace,
    command: meta.command,
    deeplink: meta.deeplink,
  },
  ZNS_VGA_FONT_DATA_URI,
)
const svglc = svg.toLowerCase()

assertok(svglc.includes('fill="#55ff55"'), 'command row must use bright green #55FF55')
assertok(!svglc.includes('#153f15'), 'must not use legacy dark green #153f15')
assertok(!svglc.includes('╔'), 'email card must use single-line CP437 frame like at.zed.cafe')
assertok(svglc.includes('openit'), 'email card must include OPENIT row')
assertok(svglc.includes('fill="#ff55ff"'), 'OPENIT arrow must use purple #FF55FF')
assertok(svglc.includes('fill="#ffff55"'), 'OPENIT label must use yellow #FFFF55')
for (const bad of LEGACY_BAD) {
  assertok(!svglc.includes(bad), `SVG must not contain legacy token ${bad}`)
}
assertok(svglc.includes(ZNS_DOT_BG.toLowerCase()), `SVG background must use ${ZNS_DOT_BG}`)
assertok(svglc.includes('cx="9" cy="15"'), 'email dot pattern must use checkerboard tile')
assertok(svglc.includes('fill="#55ffff"'), 'frame/links must use bright cyan #55FFFF')
assertok(svglc.includes('fill="#ffffff"'), 'body text must use white #FFFFFF')

const wasmpath = join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')
await initemailcardwasm(readFileSync(wasmpath))
const pngbytes = await renderemailcardpngwasmcore(svg, reademailcardfontbytes())

const pngpath = join(outdir, 'zns-email-preview.png')
const htmlpath = join(outdir, 'zns-email-preview.html')
const productionhtml = buildznscodeemailhtml({
  subject: meta.subject,
  preheader: meta.preheader,
  deeplink: meta.deeplink,
  command: meta.command,
})
const previewhtml = buildznsemailcardpreviewhtml(meta, ZNS_VGA_FONT_DATA_URI)

const emailpalette = buildznsemailpalette()
assertok(
  productionhtml.toLowerCase().includes(`background:${emailpalette.dkblue.toLowerCase()}`),
  'production email button must use dot background blue',
)
assertok(
  productionhtml.toLowerCase().includes(`color:${emailpalette.white.toLowerCase()}`),
  'production email button must use white text',
)

writeFileSync(pngpath, pngbytes)
writeFileSync(htmlpath, `${previewhtml}
<!-- production email HTML (Resend body) -->
<hr>
<h2>Production HTML</h2>
${productionhtml}`)
console.log(`wrote ${pngpath}`)
console.log(`wrote ${htmlpath}`)
console.log(`open: file://${htmlpath}`)
