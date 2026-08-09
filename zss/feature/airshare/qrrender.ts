import { encode } from 'uqr'

/** Encode binary frame into a QR module matrix (ECC L, pinned mask). */
export function airshareencodemodulematrix(frame: Uint8Array): {
  size: number
  data: boolean[][]
} {
  const result = encode(Array.from(frame), {
    ecc: 'L',
    maskPattern: 0,
    border: 2,
    boostEcc: false,
  })
  return { size: result.size, data: result.data }
}

/** Draw QR matrix onto a canvas (black modules on white). */
export function airsharedrawqr(
  canvas: HTMLCanvasElement,
  matrix: boolean[][],
  pixelsize = 4,
) {
  const size = matrix.length
  const dim = size * pixelsize
  canvas.width = dim
  canvas.height = dim
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, dim, dim)
  ctx.fillStyle = '#000000'
  for (let y = 0; y < size; ++y) {
    const row = matrix[y]
    for (let x = 0; x < size; ++x) {
      if (row[x]) {
        ctx.fillRect(x * pixelsize, y * pixelsize, pixelsize, pixelsize)
      }
    }
  }
}
