import { useMemo } from 'react'
import { CanvasTexture, NearestFilter, Texture } from 'three'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { BITMAP, bitmapToCanvas } from 'zss/gadget/data/bitmap'

export function updateTexture<T extends Texture | CanvasTexture>(texture: T) {
  texture.generateMipmaps = false
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.needsUpdate = true
  return texture
}

export function createbitmaptexture(
  bitmap: BITMAP | undefined,
): MAYBE<CanvasTexture> {
  if (!ispresent(bitmap)) {
    return undefined
  }
  return updateTexture(new CanvasTexture(bitmapToCanvas(bitmap)))
}

export default function useBitmapTexture(bitmap: BITMAP | undefined) {
  return useMemo(() => createbitmaptexture(bitmap), [bitmap])
}
