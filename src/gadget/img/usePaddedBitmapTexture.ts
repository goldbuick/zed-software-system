import { useMemo } from 'react'
import * as THREE from 'three'

import { Bitmap, bitmapToCanvas } from '@/gadget/img/bitmap'
import { updateTexture } from '@/gadget/img/load'
import paddedTexture from '@/gadget/img/paddedTexture'

export default function usePaddedBitmapTexture(bitmap: Bitmap) {
  return useMemo(
    () =>
      updateTexture(
        new THREE.CanvasTexture(paddedTexture(bitmapToCanvas(bitmap))),
      ),
    [bitmap?.id],
  )
}
