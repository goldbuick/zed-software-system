import { MAYBE, ispresent } from 'zss/mapping/types'

import { CHAR_HEIGHT, CHAR_WIDTH } from './types'

export type BITMAP = {
  width: number
  height: number
  size: number
  bits: Uint8Array
}

export function bitmapToCanvas(bitmap: BITMAP) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap?.width || 1
  canvas.height = bitmap?.height || 1

  if (bitmap) {
    const context = canvas.getContext('2d')
    const imageData = context?.getImageData(0, 0, bitmap.width, bitmap.height)

    if (imageData && context) {
      let b = 0
      const { data } = imageData

      for (let i = 0; i < data.length; i += 4) {
        const value = bitmap.bits[b]
        data[i] = value // red
        data[i + 1] = value // green
        data[i + 2] = value // blue
        data[i + 3] = 255
        b += 1
      }

      context.putImageData(imageData, 0, 0)
    }
  }

  return canvas
}

export function createbitmap(width: number, height: number): BITMAP {
  return {
    width,
    height,
    size: width * height,
    bits: new Uint8Array(width * height).fill(0),
  }
}

export function createbitmapfromarray(
  width: number,
  height: number,
  bits: number[],
): BITMAP {
  return {
    width,
    height,
    size: width * height,
    bits: new Uint8Array(bits),
  }
}

export function createspritebitmapfrombitmap(
  source: MAYBE<BITMAP>,
  charwidth: number,
  charheight: number,
) {
  if (!ispresent(source)) {
    return undefined
  }

  const rows = Math.round(source.height / charheight)
  const cols = Math.round(source.width / charwidth)
  const padwidth = charwidth + 2
  const padheight = charheight + 2
  const sourcewidth = cols * charwidth
  const spritewidth = cols * padwidth
  const spriteheight = rows * padheight
  const spritebitmap = createbitmap(spritewidth, spriteheight)

  for (let y = 0; y < rows; ++y) {
    for (let x = 0; x < cols; ++x) {
      for (let py = 0; py < charheight; ++py) {
        for (let px = 0; px < charwidth; ++px) {
          const sx = x * charwidth + px
          const sy = y * charheight + py
          const sourcebit = source.bits[sx + sy * sourcewidth]
          const dx = x * padwidth + px + 1
          const dy = y * padheight + py + 1
          const idx = dx + dy * spritewidth
          spritebitmap.bits[idx] = sourcebit
          if (px === 0) {
            spritebitmap.bits[idx - 1] = sourcebit
          }
          if (px === CHAR_WIDTH - 1) {
            spritebitmap.bits[idx + 1] = sourcebit
          }
          if (py === 0) {
            spritebitmap.bits[idx - spritewidth] = sourcebit
          }
          if (py === CHAR_HEIGHT - 1) {
            spritebitmap.bits[idx + spritewidth] = sourcebit
          }
        }
      }
    }
  }

  return spritebitmap
}
