import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import { useClipping } from '../../clipping'
import defaultCharSetUrl from '../../img/charSet.png'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from '../../img/tiles'
import { TILE_IMAGE_SIZE } from '../../img/types'
import useTexture from '../../img/useTexture'

export function writeString(str: string) {
  const chars: number[] = []

  for (let i = 0; i < str.length; ++i) {
    chars.push(str.charCodeAt(i))
  }

  return chars
}

type ElementProps = {
  width: number
  height: number
  chars: number[]
  colors: number[]
  bgs: number[]
} & JSX.IntrinsicElements['mesh']

export function Element({
  width,
  height,
  chars,
  colors,
  bgs,
  ...props
}: ElementProps) {
  const map = useTexture(defaultCharSetUrl)
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const material = useMemo(() => createTilemapMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } = map.image ?? {}

  // create data texture
  useEffect(() => {
    material.uniforms.data.value = createTilemapDataTexture(
      width,
      height,
      chars,
      colors,
      bgs,
    )

    // update single quad to proper size
    if (bgRef.current) {
      createTilemapBufferGeometry(bgRef.current, width, height)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  // update data texture
  useEffect(() => {
    updateTilemapDataTexture(
      material.uniforms.data.value,
      width,
      height,
      chars,
      colors,
      bgs,
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, colors, bgs])

  // config material
  useEffect(() => {
    if (!map) {
      return
    }
    material.uniforms.map.value = map
    material.uniforms.alt.value = map // alt
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.uniforms.step.value.x =
      1 / Math.round(imageWidth / TILE_IMAGE_SIZE)
    material.uniforms.step.value.y =
      1 / Math.round(imageHeight / TILE_IMAGE_SIZE)
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [map, material, width, height, imageWidth, imageHeight, clippingPlanes])

  return (
    <mesh material={material} {...props}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
