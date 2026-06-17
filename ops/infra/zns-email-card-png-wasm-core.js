import { ZNS_VGA_FONT_TTF_BASE64 } from './generated/zns-vga-font.js'
import { initWasm, Resvg } from '@resvg/resvg-wasm'

let wasminited = false

/** resvg-wasm does not load WOFF; production email PNG must use TTF bytes. */
export function reademailcardfontbytes() {
  const binary = atob(ZNS_VGA_FONT_TTF_BASE64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function emailcardresvgoptions(fontbytes) {
  const opts = {
    fitTo: { mode: 'width', value: 520 },
    font: {
      loadSystemFonts: false,
      defaultFontFamily: 'IBM EGA 8x14',
      monospaceFamily: 'IBM EGA 8x14',
    },
  }
  if (fontbytes) {
    opts.font.fontBuffers = [fontbytes]
  }
  return opts
}

export async function initemailcardwasm(wasmmodule) {
  if (!wasminited) {
    await initWasm(wasmmodule)
    wasminited = true
  }
}

export function pngbytestobase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function assertemailcardpngreadable(rendered, pngbytes) {
  if (pngbytes.length < 6000) {
    throw new Error(
      `email PNG too small (${pngbytes.length} bytes) — resvg-wasm likely dropped all text`,
    )
  }
  const { width, height, pixels } = rendered
  let greencount = 0
  let whitecount = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const red = pixels[i]
      const green = pixels[i + 1]
      const blue = pixels[i + 2]
      if (green >= 160 && green > red && green > blue && red >= 40) {
        greencount++
      }
      if (red >= 240 && green >= 240 && blue >= 240) {
        whitecount++
      }
    }
  }
  if (greencount < 8) {
    throw new Error(
      `email PNG missing bright green command text (${greencount} green pixels)`,
    )
  }
  if (whitecount < 40) {
    throw new Error(
      `email PNG missing white body text (${whitecount} white pixels)`,
    )
  }
}

export async function renderemailcardpngwasmcore(svg, fontbytes) {
  const resvg = new Resvg(svg, emailcardresvgoptions(fontbytes))
  const rendered = resvg.render()
  const pngbytes = rendered.asPng()
  assertemailcardpngreadable(rendered, pngbytes)
  return pngbytes
}
