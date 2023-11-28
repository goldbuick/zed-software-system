import React, { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import {
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from '../display/dither'
import { createTilemapBufferGeometry } from '../display/tiles'

import { useClipping } from './clipping'

interface DitherProps {
  width: number
  height: number
  alphas: number[]
}

export function Dither({ width, height, alphas }: DitherProps) {
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const material = useMemo(() => createDitherMaterial(), [])

  // create data texture
  useEffect(() => {
    material.uniforms.data.value = createDitherDataTexture(width, height)
  }, [width, height])

  // set data texture
  useEffect(() => {
    updateDitherDataTexture(material.uniforms.data.value, width, height, alphas)
  }, [width, height, alphas])

  // create / config material
  useEffect(() => {
    if (!bgRef.current) {
      return
    }

    createTilemapBufferGeometry(bgRef.current, width, height)

    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [material, clippingPlanes])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )

  return null
}
