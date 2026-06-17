import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import {
  initemailcardwasm,
  pngbytestobase64,
  reademailcardfontbytes,
  renderemailcardpngwasmcore,
} from './zns-email-card-png-wasm-core.js'

export {
  assertemailcardpngreadable,
  emailcardresvgoptions,
  initemailcardwasm,
  pngbytestobase64,
  reademailcardfontbytes,
} from './zns-email-card-png-wasm-core.js'

export async function renderemailcardpngwasm(svg, fontbytes) {
  await initemailcardwasm(resvgWasm)
  return renderemailcardpngwasmcore(svg, fontbytes)
}
