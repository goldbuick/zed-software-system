import { useMemo } from 'react'
import * as THREE from 'three'

import { Bitmap, bitmapToCanvas } from '/cc/game/img/bitmap'
import { updateTexture } from '/cc/game/img/load'

export default function useBitmapTexture(bitmap: Bitmap) {
  return useMemo(
    () => updateTexture(new THREE.CanvasTexture(bitmapToCanvas(bitmap))),
    [bitmap?.id],
  )
}
