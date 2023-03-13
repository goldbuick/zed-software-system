import { nanoid } from 'nanoid'

import imgLoad from '@/gadget/img/load'

export type Bitmap = {
  id: string
  width: number
  height: number
  size: number
  bits: Uint8Array
  color?: number
}

export function bitmapToCanvas(bitmap: Bitmap) {
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
        const value = bitmap.bits[b] ? 255 : 0
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

export function bitmapToDataUrl(bitmap: Bitmap) {
  return bitmapToCanvas(bitmap).toDataURL('image/png', 1)
}

function checkUsed(
  bitmap: Bitmap,
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

export function percentUsed(bitmap: Bitmap, tileSize: number) {
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
  source: Bitmap,
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
  dest: Bitmap,
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
  source: Bitmap,
  sx: number,
  sy: number,
  width: number,
  height: number,
  dest: Bitmap,
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

export default function create(width: number, height: number): Bitmap {
  return {
    id: nanoid(),
    width,
    height,
    size: width * height,
    bits: new Uint8Array(width * height).fill(0),
  }
}

export function resizeBitmap(bitmap: Bitmap, width: number, height: number) {
  const newBitmap = create(width, height)
  copyBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, newBitmap, 0, 0)
  return newBitmap
}

export async function bitmapFromDataUrl(src: string) {
  const image = await imgLoad(src)

  const canvas = document.createElement('canvas')
  canvas.width = image?.width || 1
  canvas.height = image?.height || 1

  const context = canvas.getContext('2d')
  if (!context) {
    return create(canvas.width, canvas.height)
  }

  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const bitmap = create(canvas.width, canvas.height)

  let b = 0
  const { data } = imageData
  for (let i = 0; i < data.length; i += 4) {
    bitmap.bits[b] = data[i] ? 1 : 0
    b += 1
  }

  return bitmap
}
