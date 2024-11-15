import { useEffect, useMemo, useRef, useState } from 'react'
import { Box2, BufferGeometry, MathUtils, Vector2 } from 'three'

import {
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from '../display/dither'
import { createTilemapBufferGeometry } from '../display/tiles'

import { useClipping } from './clipping'

type DitherProps = {
  width: number
  height: number
  alphas: number[]
}

export function Dither({ width, height, alphas }: DitherProps) {
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const [material] = useState(() => createDitherMaterial())

  // create data texture
  useEffect(() => {
    material.uniforms.data.value = createDitherDataTexture(width, height)
  }, [material.uniforms.data, width, height])

  // set data texture
  useEffect(() => {
    updateDitherDataTexture(material.uniforms.data.value, width, height, alphas)
  }, [material.uniforms.data.value, width, height, alphas])

  // create / config material
  useEffect(() => {
    if (!bgRef.current) {
      return
    }

    createTilemapBufferGeometry(bgRef.current, width, height)

    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [material, clippingPlanes, width, height])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}

type StaticDitherProps = {
  width: number
  height: number
  alpha: number
}

export function StaticDither({ width, height, alpha }: StaticDitherProps) {
  const alphas = useMemo(
    () => new Array(width * height).fill(alpha),
    [width, height, alpha],
  )
  return <Dither width={width} height={height} alphas={alphas} />
}

type ShadeBoxDitherProps = {
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
  scale?: number
  alpha?: number
}

const box = new Box2()
const point = new Vector2()

export function ShadeBoxDither({
  width,
  height,
  top,
  left,
  right,
  bottom,
  scale = 0.125,
  alpha = 0.25,
}: ShadeBoxDitherProps) {
  const alphas = useMemo(() => {
    const values = new Array(width * height)
    box.min.x = left
    box.min.y = top
    box.max.x = right
    box.max.y = bottom
    point.x = 0
    point.y = 0
    for (let i = 0; i < values.length; ++i) {
      values[i] =
        MathUtils.smootherstep(1 - box.distanceToPoint(point) * scale, 0, 1) *
        alpha
      ++point.x
      if (point.x >= width) {
        point.x = 0
        ++point.y
      }
    }
    return values
  }, [width, height, top, left, right, bottom, scale, alpha])
  return <Dither width={width} height={height} alphas={alphas} />
}
