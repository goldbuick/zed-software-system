import { createGuid } from 'zss/mapping/guid'

export type BITMAP = {
  id: string
  width: number
  height: number
  size: number
  bits: Uint8Array
  color?: number
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

function checkUsed(
  bitmap: BITMAP,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (let ly = 0; ly < height; ly += 1) {
    for (let lx = 0; lx < width; lx += 1) {
      const index = x + lx + (y + ly) * bitmap.width
      if (bitmap.bits[index]) {
        return true
      }
    }
  }
  return false
}

export function percentUsed(bitmap: BITMAP, tileSize: number) {
  if (bitmap) {
    const cols = Math.floor(bitmap.width / tileSize) || 1
    const rows = Math.floor(bitmap.height / tileSize) || 1
    const total = cols * rows
    let used = 0
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (checkUsed(bitmap, x * tileSize, y * tileSize, tileSize, tileSize)) {
          used += 1
        }
      }
    }
    return used / total
  }
  return 0
}

export function readBits(
  source: BITMAP,
  sx: number,
  sy: number,
  width: number,
  height: number,
) {
  const bits = new Uint8Array(width * height)

  let i = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sindex = x + sx + (y + sy) * source.width
      bits[i] = source.bits[sindex]
      i += 1
    }
  }

  return bits
}

export function writeBits(
  dest: BITMAP,
  bits: Uint8Array,
  dx: number,
  dy: number,
  width: number,
  height: number,
) {
  let i = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dindex = x + dx + (y + dy) * dest.width
      dest.bits[dindex] = bits[i]
      i += 1
    }
  }
}

export function copyBitmap(
  source: BITMAP,
  sx: number,
  sy: number,
  width: number,
  height: number,
  dest: BITMAP,
  dx: number,
  dy: number,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sindex = x + sx + (y + sy) * source.width
      const dindex = x + dx + (y + dy) * dest.width
      dest.bits[dindex] = source.bits[sindex]
    }
  }
}

export function createBitmap(width: number, height: number): BITMAP {
  return {
    id: createGuid(),
    width,
    height,
    size: width * height,
    bits: new Uint8Array(width * height).fill(0),
  }
}

export function resizeBitmap(bitmap: BITMAP, width: number, height: number) {
  const newBitmap = createBitmap(width, height)
  copyBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, newBitmap, 0, 0)
  return newBitmap
}
