import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ZNS_VGA_FONT_DATA_URI } from '../../../ops/infra/generated/zns-vga-font.js'
import { buildznscodemeta, buildznscodeemailhtml } from '../../../ops/infra/zns-email-card.js'
import {
  buildznsemailcardpreviewhtml,
  buildznsemailcardsvg,
} from '../../../ops/infra/zns-email-card-svg.js'
import { renderemailcardpng } from '../../../ops/infra/zns-email-card-png.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const outdir = join(root, 'ops/infra/generated')
const code = '263345'
const email = 'whitlark@gmail.com'
const namespace = 'docs'
const joinorigin = 'https://zed.cafe'

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
const pngbytes = await renderemailcardpng(svg)
const pngpath = join(outdir, 'zns-email-preview.png')
const htmlpath = join(outdir, 'zns-email-preview.html')
const productionhtml = buildznscodeemailhtml({
  subject: meta.subject,
  preheader: meta.preheader,
  deeplink: meta.deeplink,
  command: meta.command,
})
const previewhtml = buildznsemailcardpreviewhtml(meta, ZNS_VGA_FONT_DATA_URI)

writeFileSync(pngpath, pngbytes)
writeFileSync(htmlpath, `${previewhtml}
<!-- production email HTML (Resend body) -->
<hr>
<h2>Production HTML</h2>
${productionhtml}`)
console.log(`wrote ${pngpath}`)
console.log(`wrote ${htmlpath}`)
console.log(`open: file://${htmlpath}`)
