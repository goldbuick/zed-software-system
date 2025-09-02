// Palette handling module for AnsiLove

import type { FileObj } from './types'

function egaRGB(value: number): Uint8Array {
  return new Uint8Array([
    (((value & 32) >> 5) + ((value & 4) >> 1)) * 0x55,
    (((value & 16) >> 4) + (value & 2)) * 0x55,
    (((value & 8) >> 3) + ((value & 1) << 1)) * 0x55,
    255,
  ])
}

export const ASC_PC: Uint8Array[] = [
  0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
].map(egaRGB)
export const ANSI: Uint8Array[] = [
  0, 4, 2, 20, 1, 5, 3, 7, 56, 60, 58, 62, 57, 61, 59, 63,
].map(egaRGB)
export const BIN: Uint8Array[] = [
  0, 1, 2, 3, 4, 5, 20, 7, 56, 57, 58, 59, 60, 61, 62, 63,
].map(egaRGB)
export const CED: Uint8Array[] = [
  7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
].map(egaRGB)
export const WORKBENCH: Uint8Array[] = [
  new Uint8Array([170, 170, 170, 255]),
  new Uint8Array([170, 170, 170, 255]),
  new Uint8Array([0, 0, 0, 255]),
  new Uint8Array([0, 0, 0, 255]),
  new Uint8Array([255, 255, 255, 255]),
  new Uint8Array([255, 255, 255, 255]),
  new Uint8Array([102, 136, 187, 255]),
  new Uint8Array([102, 136, 187, 255]),
  new Uint8Array([0, 0, 255, 255]),
  new Uint8Array([0, 0, 255, 255]),
  new Uint8Array([255, 0, 255, 255]),
  new Uint8Array([255, 0, 255, 255]),
  new Uint8Array([0, 255, 255, 255]),
  new Uint8Array([0, 255, 255, 255]),
  new Uint8Array([255, 255, 255, 255]),
  new Uint8Array([255, 255, 255, 255]),
]

export function triplets16(file: FileObj): Uint8Array[] {
  const pal: Uint8Array[] = []
  for (let i = 0; i < 16; ++i) {
    const r = file.get()
    const g = file.get()
    const b = file.get()
    pal.push(
      new Uint8Array([
        (r << 2) | (r >> 4),
        (g << 2) | (g >> 4),
        (b << 2) | (b >> 4),
        255,
      ]),
    )
  }
  return pal
}

export function adf(file: FileObj): Uint8Array[] {
  const pal: Uint8Array[] = []
  for (let i = 0; i < 64; ++i) {
    const r = file.get()
    const g = file.get()
    const b = file.get()
    pal.push(
      new Uint8Array([
        (r << 2) | (r >> 4),
        (g << 2) | (g >> 4),
        (b << 2) | (b >> 4),
        255,
      ]),
    )
  }
  return [
    pal[0],
    pal[1],
    pal[2],
    pal[3],
    pal[4],
    pal[5],
    pal[20],
    pal[7],
    pal[56],
    pal[57],
    pal[58],
    pal[59],
    pal[60],
    pal[61],
    pal[62],
    pal[63],
  ]
}

export const PaletteModule = {
  ASC_PC,
  ANSI,
  BIN,
  CED,
  WORKBENCH,
  adf,
  triplets16,
}
