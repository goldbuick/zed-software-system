import { useMemo } from 'react'
import * as THREE from 'three'

import { Bitmap, bitmapToCanvas } from './bitmap'
import { updateTexture } from './load'

export default function useBitmapTexture(bitmap: Bitmap) {
  return useMemo(
    () => updateTexture(new THREE.CanvasTexture(bitmapToCanvas(bitmap))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bitmap?.id],
  )
}
