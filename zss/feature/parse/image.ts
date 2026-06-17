import getSimilarColor, { IDefaultColor } from 'get-similar-color/dist'
import { apierror, apitoast, vmreadimageimport } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { loadpalettefrombytes } from 'zss/feature/bytes'
import { PALETTE } from 'zss/feature/palette'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { importscreentopatchwork } from './patchworkimport'

export const IMAGE_IMPORT_MAX_COLS = 240
export const IMAGE_IMPORT_MAX_ROWS = 120

export const IMAGE_IMPORT_SCALE_PRESETS = [0.5, 1, 1.5, 2] as const

const ALPHA_SKIP = 128
const HALF_BLOCK_MARGIN = 1.15
const MIN_HALF_RGB_DIST = 2000

const SHADE_CHARS = [176, 177, 178, 219] as const
const SHADE_LEVELS = [0.125, 0.375, 0.625, 0.875]

type RGB = { r: number; g: number; b: number }

export type STAGED_IMAGE = {
  filename: string
  mimetype: string
  bytes: Uint8Array
  width: number
  height: number
}

let stagedimage: STAGED_IMAGE | undefined

export function readstagedimage(): STAGED_IMAGE | undefined {
  return stagedimage
}

export function clearstagedimage() {
  stagedimage = undefined
}

export function cellcolsrows(
  imagewidth: number,
  imageheight: number,
  scale: number,
): { cols: number; rows: number; samplew: number; sampleh: number } {
  const samplew = Math.max(1, Math.round(CHAR_WIDTH / scale))
  const sampleh = Math.max(1, Math.round(CHAR_HEIGHT / scale))
  return {
    cols: Math.ceil(imagewidth / samplew),
    rows: Math.ceil(imageheight / sampleh),
    samplew,
    sampleh,
  }
}

export function boardcountforcells(cols: number, rows: number): {
  boardx: number
  boardy: number
} {
  return {
    boardx: Math.ceil(cols / BOARD_WIDTH),
    boardy: Math.ceil(rows / BOARD_HEIGHT),
  }
}

export function imageimportwithincap(
  imagewidth: number,
  imageheight: number,
  scale: number,
): boolean {
  const { cols, rows } = cellcolsrows(imagewidth, imageheight, scale)
  return cols <= IMAGE_IMPORT_MAX_COLS && rows <= IMAGE_IMPORT_MAX_ROWS
}

function relativeluminance(rgb: RGB): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
}

function rgbdistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

export function buildpalettehelpers(): {
  colorlist: IDefaultColor[]
  palettergb: RGB[]
} {
  const palette = convertpalettetocolors(loadpalettefrombytes(PALETTE))
  const colorlist: IDefaultColor[] = []
  const palettergb: RGB[] = []
  for (let i = 0; i < palette.length; ++i) {
    const p = palette[i]
    const rgb = {
      r: Math.round(p.r * 255),
      g: Math.round(p.g * 255),
      b: Math.round(p.b * 255),
    }
    colorlist.push({ name: `${i}`, rgb })
    palettergb.push(rgb)
  }
  return { colorlist, palettergb }
}

function nearestpaletteindex(
  rgb: RGB,
  colorlist: IDefaultColor[],
): number {
  const match = getSimilarColor({ targetColor: rgb, colorArray: colorlist })
  return parseFloat(match?.name ?? '0')
}

function darkerpaletteindex(
  fg: number,
  rgb: RGB,
  colorlist: IDefaultColor[],
  palettergb: RGB[],
): number {
  const fglum = relativeluminance(palettergb[fg] ?? rgb)
  let best = 0
  let bestdist = Infinity
  for (let i = 0; i < palettergb.length; ++i) {
    if (relativeluminance(palettergb[i]) >= fglum) {
      continue
    }
    const dist = rgbdistance(rgb, palettergb[i])
    if (dist < bestdist) {
      bestdist = dist
      best = i
    }
  }
  return best
}

function averagergbinrect(
  data: Uint8ClampedArray,
  imagewidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
): { rgb: RGB; alpha: number } | undefined {
  let r = 0
  let g = 0
  let b = 0
  let alpha = 0
  let count = 0
  const x1 = Math.min(x0 + w, imagewidth)
  const y1 = y0 + h
  for (let y = y0; y < y1; ++y) {
    for (let x = x0; x < x1; ++x) {
      const i = (x + y * imagewidth) * 4
      const a = data[i + 3]
      if (a < ALPHA_SKIP) {
        continue
      }
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      alpha += a
      count += 1
    }
  }
  if (count === 0) {
    return undefined
  }
  return {
    rgb: {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    },
    alpha: alpha / count,
  }
}

function shadeblockglyph(
  avg: RGB,
  colorlist: IDefaultColor[],
  palettergb: RGB[],
): [number, number, number] {
  const fg = nearestpaletteindex(avg, colorlist)
  const bg = darkerpaletteindex(fg, avg, colorlist, palettergb)
  const avglum = relativeluminance(avg)
  const fglum = relativeluminance(palettergb[fg] ?? avg)
  const bglum = relativeluminance(palettergb[bg] ?? avg)
  const span = fglum - bglum
  let t = span > 0 ? (avglum - bglum) / span : 0.5
  if (t < 0) {
    t = 0
  }
  if (t > 1) {
    t = 1
  }
  let char = SHADE_CHARS[SHADE_CHARS.length - 1]
  for (let i = 0; i < SHADE_LEVELS.length; ++i) {
    if (t <= SHADE_LEVELS[i]) {
      char = SHADE_CHARS[i]
      break
    }
  }
  return [char, fg, bg]
}

type HALF_CANDIDATE = {
  char: number
  fg: number
  bg: number
  error: number
}

function scorehalfblock(
  data: Uint8ClampedArray,
  imagewidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  fgrgb: RGB,
  bgrgb: RGB,
  isfg: (px: number, py: number) => boolean,
): number {
  let error = 0
  const x1 = Math.min(x0 + w, imagewidth)
  const y1 = y0 + h
  for (let py = y0; py < y1; ++py) {
    for (let px = x0; px < x1; ++px) {
      const i = (px + py * imagewidth) * 4
      const a = data[i + 3]
      if (a < ALPHA_SKIP) {
        continue
      }
      const pixel: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] }
      const target = isfg(px - x0, py - y0) ? fgrgb : bgrgb
      error += rgbdistance(pixel, target)
    }
  }
  return error
}

function pickhalfblock(
  data: Uint8ClampedArray,
  imagewidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  colorlist: IDefaultColor[],
  palettergb: RGB[],
): HALF_CANDIDATE | undefined {
  const midy = Math.floor(h / 2)
  const midx = Math.floor(w / 2)

  const topavg = averagergbinrect(data, imagewidth, x0, y0, w, midy)
  const bottomavg = averagergbinrect(
    data,
    imagewidth,
    x0,
    y0 + midy,
    w,
    h - midy,
  )
  const leftavg = averagergbinrect(data, imagewidth, x0, y0, midx, h)
  const rightavg = averagergbinrect(
    data,
    imagewidth,
    x0 + midx,
    y0,
    w - midx,
    h,
  )

  const candidates: HALF_CANDIDATE[] = []

  if (ispresent(topavg) && ispresent(bottomavg)) {
    if (rgbdistance(topavg.rgb, bottomavg.rgb) >= MIN_HALF_RGB_DIST) {
      const topfg = nearestpaletteindex(topavg.rgb, colorlist)
      const topbg = nearestpaletteindex(bottomavg.rgb, colorlist)
      const bottomfg = nearestpaletteindex(bottomavg.rgb, colorlist)
      const bottombg = nearestpaletteindex(topavg.rgb, colorlist)
      const topfgrgb = palettergb[topfg] ?? topavg.rgb
      const topbgrgb = palettergb[topbg] ?? bottomavg.rgb
      const bottomfgrgb = palettergb[bottomfg] ?? bottomavg.rgb
      const bottombgrgb = palettergb[bottombg] ?? topavg.rgb
      candidates.push({
        char: 223,
        fg: topfg,
        bg: topbg,
        error: scorehalfblock(
          data,
          imagewidth,
          x0,
          y0,
          w,
          h,
          topfgrgb,
          topbgrgb,
          (_px, py) => py < midy,
        ),
      })
      candidates.push({
        char: 220,
        fg: bottomfg,
        bg: bottombg,
        error: scorehalfblock(
          data,
          imagewidth,
          x0,
          y0,
          w,
          h,
          bottomfgrgb,
          bottombgrgb,
          (_px, py) => py >= midy,
        ),
      })
    }
  }

  if (ispresent(leftavg) && ispresent(rightavg)) {
    if (rgbdistance(leftavg.rgb, rightavg.rgb) >= MIN_HALF_RGB_DIST) {
      const leftfg = nearestpaletteindex(leftavg.rgb, colorlist)
      const leftbg = nearestpaletteindex(rightavg.rgb, colorlist)
      const rightfg = nearestpaletteindex(rightavg.rgb, colorlist)
      const rightbg = nearestpaletteindex(leftavg.rgb, colorlist)
      const leftfgrgb = palettergb[leftfg] ?? leftavg.rgb
      const leftbgrgb = palettergb[leftbg] ?? rightavg.rgb
      const rightfgrgb = palettergb[rightfg] ?? rightavg.rgb
      const rightbgrgb = palettergb[rightbg] ?? leftavg.rgb
      candidates.push({
        char: 221,
        fg: leftfg,
        bg: leftbg,
        error: scorehalfblock(
          data,
          imagewidth,
          x0,
          y0,
          w,
          h,
          leftfgrgb,
          leftbgrgb,
          (px, _py) => px < midx,
        ),
      })
      candidates.push({
        char: 222,
        fg: rightfg,
        bg: rightbg,
        error: scorehalfblock(
          data,
          imagewidth,
          x0,
          y0,
          w,
          h,
          rightfgrgb,
          rightbgrgb,
          (px, _py) => px >= midx,
        ),
      })
    }
  }

  if (candidates.length === 0) {
    return undefined
  }

  let best = candidates[0]
  for (let i = 1; i < candidates.length; ++i) {
    if (candidates[i].error < best.error) {
      best = candidates[i]
    }
  }
  return best
}

function shadefallbackerror(
  data: Uint8ClampedArray,
  imagewidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  glyph: [number, number, number],
  palettergb: RGB[],
): number {
  const [char, fg, bg] = glyph
  const fgrgb = palettergb[fg] ?? { r: 0, g: 0, b: 0 }
  const bgrgb = palettergb[bg] ?? { r: 0, g: 0, b: 0 }
  const level = SHADE_LEVELS[SHADE_CHARS.indexOf(char as (typeof SHADE_CHARS)[number])] ?? 1
  let error = 0
  const x1 = Math.min(x0 + w, imagewidth)
  const y1 = y0 + h
  for (let py = y0; py < y1; ++py) {
    for (let px = x0; px < x1; ++px) {
      const i = (px + py * imagewidth) * 4
      const a = data[i + 3]
      if (a < ALPHA_SKIP) {
        continue
      }
      const pixel: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] }
      const target: RGB = {
        r: Math.round(bgrgb.r + (fgrgb.r - bgrgb.r) * level),
        g: Math.round(bgrgb.g + (fgrgb.g - bgrgb.g) * level),
        b: Math.round(bgrgb.b + (fgrgb.b - bgrgb.b) * level),
      }
      error += rgbdistance(pixel, target)
    }
  }
  return error
}

export function pickcellglyph(
  data: Uint8ClampedArray,
  imagewidth: number,
  x0: number,
  y0: number,
  samplew: number,
  sampleh: number,
  colorlist: IDefaultColor[],
  palettergb: RGB[],
): [number, number, number] | undefined {
  const whole = averagergbinrect(data, imagewidth, x0, y0, samplew, sampleh)
  if (!ispresent(whole)) {
    return undefined
  }

  const half = pickhalfblock(
    data,
    imagewidth,
    x0,
    y0,
    samplew,
    sampleh,
    colorlist,
    palettergb,
  )
  const shade = shadeblockglyph(whole.rgb, colorlist, palettergb)
  const shadeerror = shadefallbackerror(
    data,
    imagewidth,
    x0,
    y0,
    samplew,
    sampleh,
    shade,
    palettergb,
  )

  if (ispresent(half) && half.error * HALF_BLOCK_MARGIN < shadeerror) {
    return [half.char, half.fg, half.bg]
  }
  return shade
}

async function decodeimagedata(
  bytes: Uint8Array,
  mimetype: string,
): Promise<{ data: ImageData; width: number; height: number }> {
  const blob = new Blob([bytes as BlobPart], { type: mimetype })
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ispresent(ctx)) {
    throw new Error('could not get canvas 2d context')
  }
  ctx.drawImage(bitmap, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  bitmap.close()
  return { data, width: canvas.width, height: canvas.height }
}

export async function probeimagebytes(
  bytes: Uint8Array,
  mimetype: string,
): Promise<{ width: number; height: number }> {
  const decoded = await decodeimagedata(bytes, mimetype)
  return { width: decoded.width, height: decoded.height }
}

function titlename(filename: string): string {
  return filename.replace(/\.[^.]+$/i, '') || filename
}

export async function stageimageimport(
  player: string,
  filename: string,
  mimetype: string,
  bytes: Uint8Array,
) {
  try {
    const { width, height } = await probeimagebytes(bytes, mimetype)
    stagedimage = { filename, mimetype, bytes, width, height }
    vmreadimageimport(SOFTWARE, player)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    apierror(SOFTWARE, player, 'parsewebfile', message)
  }
}

export async function parseimage(
  player: string,
  filename: string,
  mimetype: string,
  bytes: Uint8Array,
  scale: number,
) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    apitoast(SOFTWARE, player, 'no content book to import into')
    return
  }

  try {
    const decoded = await decodeimagedata(bytes, mimetype)
    const { cols, rows, samplew, sampleh } = cellcolsrows(
      decoded.width,
      decoded.height,
      scale,
    )

    if (cols > IMAGE_IMPORT_MAX_COLS || rows > IMAGE_IMPORT_MAX_ROWS) {
      apitoast(
        SOFTWARE,
        player,
        `image too large at ${Math.round(scale * 100)}% (${cols}×${rows} cells)`,
      )
      return
    }

    const { colorlist, palettergb } = buildpalettehelpers()
    const screen: [number, number, number][] = []

    for (let cy = 0; cy < rows; ++cy) {
      for (let cx = 0; cx < cols; ++cx) {
        const x0 = cx * samplew
        const y0 = cy * sampleh
        const w = Math.min(samplew, decoded.width - x0)
        const h = Math.min(sampleh, decoded.height - y0)
        const glyph = pickcellglyph(
          decoded.data.data,
          decoded.width,
          x0,
          y0,
          w,
          h,
          colorlist,
          palettergb,
        )
        if (ispresent(glyph)) {
          screen.push(glyph)
        } else {
          screen.push([32, 0, 0])
        }
      }
    }

    const patchworkname = titlename(filename)
    importscreentopatchwork(
      player,
      patchworkname,
      cols,
      rows,
      screen,
      'image',
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    apierror(SOFTWARE, player, 'parsewebfile', message)
  }
}

export async function parseimagefromstage(player: string, scale: number) {
  const pending = readstagedimage()
  if (!ispresent(pending)) {
    apitoast(SOFTWARE, player, 'no image staged for import')
    return
  }
  await parseimage(
    player,
    pending.filename,
    pending.mimetype,
    pending.bytes,
    scale,
  )
  clearstagedimage()
}
