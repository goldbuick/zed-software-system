import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
} from 'three'
import { ispresent } from 'zss/mapping/types'

import { SPRITE } from '../data/types'
import { time } from '../display/anim'
import { createBlockDitherMaterial } from '../display/dither'
import { useSpritePool } from '../display/spritepool'
import { createTilemapBufferGeometryAttributes } from '../display/tiles'

type ShadowMeshesProps = {
  sprites: SPRITE[]
  limit: number
  children: (x: number, y: number) => [number, number, number]
}

const dummy = new Object3D()

export function ShadowMeshes({ sprites, limit, children }: ShadowMeshesProps) {
  const [meshes, setmeshes] = useState<InstancedMesh>()
  const [visible, setvisible] = useState<InstancedBufferAttribute>()
  const [nowposition, setnowposition] = useState<InstancedBufferAttribute>()
  const [lastmatrix, setlastmatrix] = useState<InstancedBufferAttribute>()
  const [material] = useState(() => createBlockDitherMaterial())
  const [spritepool, range] = useSpritePool(sprites, limit)

  // set alpha
  useLayoutEffect(() => {
    material.uniforms.alpha.value = 0.5
  }, [material])

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createTilemapBufferGeometryAttributes(1, 1),
    [],
  )

  const visiblearray = useMemo(() => new Uint8Array(limit), [limit])
  const nowpositionarray = useMemo(() => new Float32Array(limit * 3), [limit])
  const lastmatrixarray = useMemo(() => new Float32Array(limit * 16), [limit])

  // process sprites
  useEffect(() => {
    if (
      !ispresent(meshes) ||
      !ispresent(visible) ||
      !ispresent(nowposition) ||
      !ispresent(lastmatrix)
    ) {
      return
    }
    const rr = 8 / 14
    for (let i = 0; i < spritepool.length; ++i) {
      const sprite = spritepool[i]
      if (sprite.id) {
        // write current pos
        const [nx, ny, nz] = children(sprite.x, sprite.y)
        // animate movement
        const firstframe = visible.getX(i) === 0
        if (firstframe) {
          dummy.scale.set(1, rr, 1)
          dummy.position.set(nx, ny, nz)
          dummy.updateMatrix()
          meshes.setMatrixAt(i, dummy.matrix)

          lastmatrix.set(dummy.matrix.toArray(), i * 16)
          lastmatrix.needsUpdate = true

          nowposition.setXYZ(i, nx, ny, time.value)
          nowposition.needsUpdate = true

          visible.setX(i, 1)
          visible.needsUpdate = true
        } else if (nowposition.getX(i) !== nx || nowposition.getY(i) !== ny) {
          meshes.getMatrixAt(i, dummy.matrix)
          lastmatrix.set(dummy.matrix.toArray(), i * 16)
          lastmatrix.needsUpdate = true

          nowposition.setXYZ(i, nx, ny, time.value)
          nowposition.needsUpdate = true

          dummy.scale.set(1, rr, 1)
          dummy.position.set(nx, ny, nz)
          dummy.updateMatrix()
          meshes.setMatrixAt(i, dummy.matrix)
        }
      } else if (visible.getX(i)) {
        visible.setX(i, 0)
        visible.needsUpdate = true
      }
    }
    meshes.instanceMatrix.needsUpdate = true
    meshes.computeBoundingBox()
    meshes.computeBoundingSphere()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprites, spritepool, range, meshes, visible, nowposition, lastmatrix])

  return (
    <instancedMesh ref={setmeshes} args={[null, null, limit]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
        <instancedBufferAttribute
          ref={setvisible}
          name="visible"
          usage={DynamicDrawUsage}
          attach="attributes-visible"
          args={[visiblearray, 1]}
        />
        <instancedBufferAttribute
          ref={setnowposition}
          name="nowposition"
          usage={DynamicDrawUsage}
          attach="attributes-nowposition"
          args={[nowpositionarray, 3]}
        />
        <instancedBufferAttribute
          ref={setlastmatrix}
          name="lastmatrix"
          usage={DynamicDrawUsage}
          attach="attributes-lastmatrix"
          args={[lastmatrixarray, 16]}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
