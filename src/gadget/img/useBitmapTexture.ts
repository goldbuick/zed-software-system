import { useMemo } from 'react'
import * as THREE from 'three'

import { Bitmap, bitmapToCanvas } from '@/gadget/img/bitmap'
import { updateTexture } from '@/gadget/img/load'

export default function useBitmapTexture(bitmap: Bitmap) {
  return useMemo(
    () => updateTexture(new THREE.CanvasTexture(bitmapToCanvas(bitmap))),
    [bitmap?.id],
  )
}
