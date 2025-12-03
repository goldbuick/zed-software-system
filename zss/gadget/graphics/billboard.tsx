import { useEffect, useMemo, useState } from 'react'
import { InstancedBufferAttribute, InstancedMesh, Object3D } from 'three'

import { SPRITE } from '../data/types'
import { createBlocksMaterial } from '../display/blocks'
import { createBillboardBufferGeometryAttributes } from '../display/tiles'
import { useMedia } from '../hooks'

type BillboardMeshesProps = {
  sprites: SPRITE[]
  limit: number
  children: (x: number, y: number) => [number, number, number]
}

const dummy = new Object3D()

export function BillboardMeshes({
  sprites,
  limit,
  children,
}: BillboardMeshesProps) {
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.charsetdata)
  const altcharset = useMedia((state) => state.altcharsetdata)
  const [material] = useState(() => createBlocksMaterial())

  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charset?.image ?? {}

  // create / config material
  useEffect(() => {
    material.uniforms.map.value = charset
    material.uniforms.alt.value = altcharset ?? charset
    material.uniforms.palette.value = palette
    const imageCols = Math.round(imageWidth / CHAR_WIDTH)
    const imageRows = Math.round(imageHeight / CHAR_HEIGHT)
    material.uniforms.cols.value = imageCols
    material.uniforms.step.value.x = 1 / imageCols
    material.uniforms.step.value.y = 1 / imageRows
    material.needsUpdate = true
  }, [palette, charset, altcharset, material, imageWidth, imageHeight])

  const [meshes, setMeshes] = useState<InstancedMesh>()
  const [visible, setvisible] = useState<InstancedBufferAttribute>()
  const [nowposition, setnowposition] = useState<InstancedBufferAttribute>()
  const [lastmatrix, setlastmatrix] = useState<InstancedBufferAttribute>()
  const [material] = useState(() => createBlockDitherMaterial())
  const [spritepool, range] = useSpritePool(sprites, limit)

  // export function Mesh() {

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createBillboardBufferGeometryAttributes(),
    [],
  )

  //   return (
  //     <>
  //       <bufferGeometry>
  //         <bufferAttribute attach="attributes-position" args={[position, 3]} />
  //         <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
  //       </bufferGeometry>
  //       <primitive object={material} attach="material" />
  //     </>
  //   )

  return (
    <instancedMesh ref={setMeshes} args={[null, null, limit]}>
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
