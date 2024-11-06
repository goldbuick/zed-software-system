import { useMemo } from 'react'
import { CanvasTexture, NearestFilter, Texture } from 'three'

import { BITMAP, bitmapToCanvas } from '../data/bitmap'

export function updateTexture<T extends Texture | CanvasTexture>(texture: T) {
  texture.generateMipmaps = false
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.needsUpdate = true
  return texture
}

export default function useBitmapTexture(bitmap: BITMAP | undefined) {
  return useMemo(
    () =>
      bitmap
        ? updateTexture(new CanvasTexture(bitmapToCanvas(bitmap)))
        : undefined,
    [bitmap],
  )
}
