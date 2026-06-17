import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

let resvgmodule = null

async function loadresvg() {
  if (resvgmodule) {
    return resvgmodule
  }
  resvgmodule = await import('@resvg/resvg-js')
  return resvgmodule
}

function readfontbytes() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const generated = join(root, 'ops/infra/generated/zns-vga-font.js')
  try {
    const mod = readFileSync(generated, 'utf8')
    const match = mod.match(/data:font\/woff;base64,([^']+)/)
    if (!match?.[1]) {
      return undefined
    }
    return Buffer.from(match[1], 'base64')
  } catch {
    const fontpath = join(
      root,
      'ops/infra/zns-public/fonts/IBMEGA8x14.woff',
    )
    try {
      return readFileSync(fontpath)
    } catch {
      return undefined
    }
  }
}

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

export async function renderemailcardpng(svg, fontbytes) {
  const { Resvg } = await loadresvg()
  const fonts = fontbytes ?? readfontbytes()
  const resvg = new Resvg(svg, resvgoptions(fonts))
  return resvg.render().asPng()
}

export function pngbytestobase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
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
