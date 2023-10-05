import { useMemo } from 'react'
import * as THREE from 'three'

import { BITMAP, bitmapToCanvas } from '../data'

export function updateTexture<T extends THREE.Texture | THREE.CanvasTexture>(
  texture: T,
) {
  texture.generateMipmaps = false
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
}

export default function useBitmapTexture(bitmap: BITMAP | undefined) {
  return useMemo(
    () =>
      bitmap
        ? updateTexture(new THREE.CanvasTexture(bitmapToCanvas(bitmap)))
        : undefined,
    [bitmap?.id],
  )
}
