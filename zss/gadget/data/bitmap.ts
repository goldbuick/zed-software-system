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
