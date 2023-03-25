import { useMemo } from 'react'
import * as THREE from 'three'

import { Bitmap, bitmapToCanvas } from '/cc/game/img/bitmap'
import { updateTexture } from '/cc/game/img/load'
import paddedTexture from '/cc/game/img/paddedTexture'

export default function usePaddedBitmapTexture(bitmap: Bitmap) {
  return useMemo(
    () =>
      updateTexture(
        new THREE.CanvasTexture(paddedTexture(bitmapToCanvas(bitmap))),
      ),
    [bitmap?.id],
  )
}
