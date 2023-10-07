import { useFrame } from '@react-three/fiber'
import React, { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import { range } from '/zss/mapping/array'

import { time } from '../display/anim'
import {
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from '../display/dither'
import { createTilemapBufferGeometry } from '../display/tiles'

import { useClipping } from './clipping'

let acc = 0
let tick = 0
const rate = 0.1
const width = 80
const height = 25
let alphas = range(width * height - 1).map(() => 0)

export function Dither() {
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const material = useMemo(() => createDitherMaterial(), [])

  // config material
  useEffect(() => {
    if (material.uniforms.data.value) {
      // update data texture with current chars
      updateDitherDataTexture(
        material.uniforms.data.value,
        width,
        height,
        alphas,
      )
    } else {
      // create data texture with current chars
      material.uniforms.data.value = createDitherDataTexture(
        width,
        height,
        alphas,
      )
    }

    // update single quad to proper size
    const count = bgRef.current?.attributes.position?.count ?? 0
    if (bgRef.current && count !== width * height * 4) {
      createTilemapBufferGeometry(bgRef.current, width, height)
    }

    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [material, clippingPlanes])

  useFrame((state, delta) => {
    acc += delta
    tick += delta

    if (tick < rate) {
      return
    }
    tick -= rate

    alphas = range(width * height - 1).map((i) => {
      const x = i % width
      const y = Math.floor(i / width)
      const scale = 0.1
      const xvalue = Math.abs(Math.cos((x + acc) * scale))
      const yvalue = Math.abs(Math.sin(y * scale))
      return 1 - (xvalue + yvalue) / 2
    })

    // update data texture with current chars
    updateDitherDataTexture(material.uniforms.data.value, width, height, alphas)
  })

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )

  return null
}
