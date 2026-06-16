import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { initWasm, Resvg } from '@resvg/resvg-wasm'

let wasminited = false

function resvgoptions(fontbytes) {
  const opts = {
    fitTo: { mode: 'width', value: 520 },
    font: {
      loadSystemFonts: false,
      defaultFontFamily: 'Courier New',
    },
  }
  if (fontbytes) {
    opts.font.fontBuffers = [fontbytes]
    opts.font.defaultFontFamily = 'IBM EGA 8x14'
  }
  return opts
}

export function pngbytestobase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function readfontbytesfromdatauri(datauri) {
  const match = String(datauri ?? '').match(/base64,([^']+)/)
  if (!match?.[1]) {
    return undefined
  }
  const binary = atob(match[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function renderemailcardpngwasm(svg, fontbytes) {
  if (!wasminited) {
    await initWasm(resvgWasm)
    wasminited = true
  }
  const resvg = new Resvg(svg, resvgoptions(fontbytes))
  return resvg.render().asPng()
}
