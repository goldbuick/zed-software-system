import { useEffect, useRef, useState } from 'react'
import { BufferGeometry } from 'three'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from 'zss/gadget/display/tiles'

import { useClipping } from '../clipping'
import { useMediaContext } from '../hooks'

type TilesProps = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
}

export function Tiles({ width, height, char, color, bg }: TilesProps) {
  const media = useMediaContext()
  const clippingPlanes = useClipping()
  const [material] = useState(() => createTilemapMaterial())
  const bgRef = useRef<BufferGeometry>(null)
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    media.charset?.image ?? {}

  // create data texture
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    material.uniforms.data.value = createTilemapDataTexture(width, height)
  }, [material.uniforms.data, width, height])

  // set data texture
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    updateTilemapDataTexture(
      material.uniforms.data.value,
      width,
      height,
      char,
      color,
      bg,
    )
  }, [material.uniforms.data.value, width, height, char, color, bg])

  // create / config material
  useEffect(() => {
    if (width === 0 || height === 0 || !bgRef.current || !media.charset) {
      return
    }
    createTilemapBufferGeometry(bgRef.current, width, height)
    material.uniforms.map.value = media.charset
    material.uniforms.alt.value = media.altcharset ?? media.charset
    material.uniforms.palette.value = media.palette
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.uniforms.step.value.x = 1 / Math.round(imageWidth / CHAR_WIDTH)
    material.uniforms.step.value.y = 1 / Math.round(imageHeight / CHAR_HEIGHT)
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [media, material, width, height, imageWidth, imageHeight, clippingPlanes])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
