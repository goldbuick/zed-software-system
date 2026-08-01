import { useEffect, useMemo, useState } from 'react'
import type { Color, Mesh, ShaderMaterial } from 'three'
import { Box2, MathUtils, Vector2 } from 'three'
import { RUNTIME } from 'zss/config'
import {
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from 'zss/gadget/display/dither'
import { createTilemapBufferGeometryAttributes } from 'zss/gadget/display/tiles'

type DitherProps = {
  width: number
  height: number
  alphas: number[]
  /** When set, forwarded to the dither mesh (e.g. `noraycastmesh`). */
  raycast?: Mesh['raycast']
  /** Opaque dither pixel color (default black). */
  color?: Color | string
  /** Optional handle to the dither ShaderMaterial (for per-frame fade uniforms). */
  materialref?: React.MutableRefObject<ShaderMaterial | null>
  /** Initial `fade` uniform (default 1). Use 0 when the parent will damp fade in. */
  initialfade?: number
}

export function Dither({
  width,
  height,
  alphas,
  raycast,
  color,
  materialref,
  initialfade = 1,
}: DitherProps) {
  const [material] = useState(() => {
    const next = createDitherMaterial()
    next.uniforms.fade.value = initialfade
    return next
  })

  useEffect(() => {
    if (!materialref) {
      return
    }
    materialref.current = material
    return () => {
      materialref.current = null
    }
  }, [material, materialref])

  // create data texture
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    const texture = createDitherDataTexture(width, height)
    material.uniforms.data.value = texture
    return () => {
      texture.dispose()
    }
  }, [material.uniforms.data, width, height])

  // set data texture
  useEffect(() => {
    updateDitherDataTexture(material.uniforms.data.value, width, height, alphas)
    // material.needsUpdate = true
  }, [material, material.uniforms.data.value, width, height, alphas])

  useEffect(() => {
    if (color === undefined) {
      return
    }
    material.uniforms.color.value.set(color)
  }, [material, color])

  // Bake DRAW_CHAR_* into verts; must rebuild when scale flips on resize.
  const drawscale = RUNTIME.DRAW_CHAR_SCALE

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createTilemapBufferGeometryAttributes(width, height),
    // drawscale: createTilemapBufferGeometryAttributes reads RUNTIME.DRAW_CHAR_*
    [width, height, drawscale],
  )

  return (
    <mesh raycast={raycast}>
      <primitive object={material} attach="material" />
      <bufferGeometry key={`${width}x${height}@${drawscale}`}>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
      </bufferGeometry>
    </mesh>
  )
}

type StaticDitherProps = {
  width: number
  height: number
  alpha: number
  raycast?: Mesh['raycast']
  color?: Color | string
  materialref?: React.MutableRefObject<ShaderMaterial | null>
  initialfade?: number
}

export function StaticDither({
  width,
  height,
  alpha,
  raycast,
  color,
  materialref,
  initialfade,
}: StaticDitherProps) {
  const alphas = useMemo(
    () => new Array(width * height).fill(alpha),
    [width, height, alpha],
  )
  return (
    <Dither
      width={width}
      height={height}
      alphas={alphas}
      raycast={raycast}
      color={color}
      materialref={materialref}
      initialfade={initialfade}
    />
  )
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
  raycast?: Mesh['raycast']
  color?: Color | string
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
  raycast,
  color,
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
  return (
    <Dither
      width={width}
      height={height}
      alphas={alphas}
      raycast={raycast}
      color={color}
    />
  )
}
