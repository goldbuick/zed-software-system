import { useEffect, useMemo, useState } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
} from 'three'
import { RUNTIME } from 'zss/config'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE } from 'zss/memory/types'

import { CHARS_PER_ROW, CHAR_HEIGHT, CHAR_WIDTH, SPRITE } from '../data/types'
import { time } from '../display/anim'
import { createBlocksBillboardMaterial } from '../display/blocks'
import { useSpritePool } from '../display/spritepool'
import { createBillboardBufferGeometryAttributes } from '../display/tiles'
import { useMedia } from '../hooks'

type BillboardMeshesProps = {
  sprites: SPRITE[]
  facing: number
  limit?: number
  children: (x: number, y: number) => [number, number, number]
}

const dummy = new Object3D()

export function BillboardMeshes({
  sprites,
  facing,
  children,
  limit = BOARD_SIZE,
}: BillboardMeshesProps) {
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.charsetdata)
  const altcharset = useMedia((state) => state.altcharsetdata)
  const [material] = useState(() => createBlocksBillboardMaterial())
  const [spritepool, range] = useSpritePool(sprites, limit)

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

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createBillboardBufferGeometryAttributes(),
    [],
  )

  const [meshes, setmeshes] = useState<InstancedMesh>()
  const visiblearray = useMemo(() => new Uint8Array(limit), [limit])
  const nowpositionarray = useMemo(() => new Float32Array(limit * 3), [limit])
  const lastmatrixarray = useMemo(() => new Float32Array(limit * 16), [limit])
  const displayarray = useMemo(() => new Float32Array(limit * 4), [limit])
  const lastcolorarray = useMemo(() => new Float32Array(limit * 2), [limit])
  const lastbgarray = useMemo(() => new Float32Array(limit * 2), [limit])

  const [visible, setvisible] = useState<InstancedBufferAttribute>()
  const [nowposition, setnowposition] = useState<InstancedBufferAttribute>()
  const [lastmatrix, setlastmatrix] = useState<InstancedBufferAttribute>()
  const [display, setdisplay] = useState<InstancedBufferAttribute>()
  const [lastcolor, setlastcolor] = useState<InstancedBufferAttribute>()
  const [lastbg, setlastbg] = useState<InstancedBufferAttribute>()

  // process sprites
  useEffect(() => {
    if (
      !ispresent(meshes) ||
      !ispresent(visible) ||
      !ispresent(nowposition) ||
      !ispresent(lastmatrix) ||
      !ispresent(display) ||
      !ispresent(lastcolor) ||
      !ispresent(lastbg)
    ) {
      return
    }
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
    for (let i = 0; i < spritepool.length; ++i) {
      const sprite = spritepool[i]
      if (sprite.id) {
        // write current pos
        const [nx, ny, nz] = children(sprite.x, sprite.y)
        // animate movement
        const firstframe = visible.getX(i) === 0
        if (firstframe) {
          dummy.rotation.set(0, 0, facing)
          dummy.position.set(nx, ny, nz)
          dummy.updateMatrix()
          meshes.setMatrixAt(i, dummy.matrix)

          dummy.position.set(nx, ny, nz + drawheight * -0.8)
          dummy.updateMatrix()
          lastmatrix.set(dummy.matrix.toArray(), i * 16)

          nowposition.setXYZ(i, nx, ny, time.value)
          display.setXYZW(
            i,
            sprite.char % CHARS_PER_ROW,
            Math.floor(sprite.char / CHARS_PER_ROW),
            sprite.color,
            sprite.bg,
          )
          lastcolor.setXY(i, sprite.color, time.value)
          lastbg.setXY(i, sprite.bg, time.value)
          visible.setX(i, 1)

          visible.needsUpdate = true
          nowposition.needsUpdate = true
          lastmatrix.needsUpdate = true
          display.needsUpdate = true
          lastcolor.needsUpdate = true
          lastbg.needsUpdate = true
          meshes.instanceMatrix.needsUpdate = true
        } else {
          if (
            nowposition.getX(i) !== nx ||
            nowposition.getY(i) !== ny ||
            meshes.userData.facing !== facing
          ) {
            meshes.getMatrixAt(i, dummy.matrix)
            lastmatrix.set(dummy.matrix.toArray(), i * 16)
            nowposition.setXYZ(i, nx, ny, time.value)
            dummy.rotation.set(0, 0, facing)
            dummy.position.set(nx, ny, nz)
            dummy.updateMatrix()
            meshes.setMatrixAt(i, dummy.matrix)
            lastmatrix.needsUpdate = true
            nowposition.needsUpdate = true
            meshes.instanceMatrix.needsUpdate = true
          }
          const ncharu = sprite.char % CHARS_PER_ROW
          const ncharv = Math.floor(sprite.char / CHARS_PER_ROW)
          if (display.getX(i) !== ncharu || display.getY(i) !== ncharv) {
            display.setXY(i, ncharu, ncharv)
            display.needsUpdate = true
          }
          if (display.getZ(i) !== sprite.color) {
            lastcolor.setXY(i, display.getZ(i), time.value)
            display.setZ(i, sprite.color)
            lastcolor.needsUpdate = true
            display.needsUpdate = true
          }
          if (display.getW(i) !== sprite.bg) {
            lastbg.setXY(i, display.getW(i), time.value)
            display.setW(i, sprite.bg)
            lastbg.needsUpdate = true
            display.needsUpdate = true
          }
        }
      } else if (visible.getX(i)) {
        visible.setX(i, 0)
        visible.needsUpdate = true
      }
    }
    meshes.userData.facing = facing
    meshes.computeBoundingBox()
    meshes.computeBoundingSphere()
    meshes.visible = !!meshes.count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprites, spritepool, facing, range, meshes, visible, lastmatrix])

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
        <instancedBufferAttribute
          ref={setdisplay}
          name="display"
          usage={DynamicDrawUsage}
          attach="attributes-display"
          args={[displayarray, 4]}
        />
        <instancedBufferAttribute
          ref={setlastcolor}
          name="lastcolor"
          usage={DynamicDrawUsage}
          attach="attributes-lastcolor"
          args={[lastcolorarray, 2]}
        />
        <instancedBufferAttribute
          ref={setlastbg}
          name="lastbg"
          usage={DynamicDrawUsage}
          attach="attributes-lastbg"
          args={[lastbgarray, 2]}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
