/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { createBlocksMaterial } from 'zss/gadget/display/blocks'
import { createPillarBufferGeometryAttributes } from 'zss/gadget/display/tiles'
import { useMedia } from 'zss/gadget/hooks'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'

type PillarwMeshesProps = {
  width: number
  char: number[]
  color: number[]
  bg: number[]
  partial?: number
  limit?: number
}

const dummy = new Object3D()
const dummycolor = new Color()

export function PillarwMeshes({
  width,
  char,
  color,
  bg,
  partial,
  limit = BOARD_SIZE,
}: PillarwMeshesProps) {
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

  // create buffer geo attributes
  const { position, uv } = useMemo(() => {
    const shape = createPillarBufferGeometryAttributes(1, 1)
    if (partial) {
      shape.position = shape.position.map((v, index) =>
        index % 3 === 2 ? v * partial : v,
      )
      shape.uv = shape.uv.map((v, index) => (index % 2 === 1 ? v * partial : v))
    }
    return shape
  }, [partial])

  const [meshes, setmeshes] = useState<InstancedMesh>()
  // process tiles
  useEffect(() => {
    if (!ispresent(meshes)) {
      return
    }
    const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
    let x = 0
    let y = 0
    let c = 0
    for (let i = 0; i < char.length; ++i) {
      if (char[i] === 0 && bg[i] === (COLOR.ONCLEAR as number)) {
        // skip
      } else {
        // update position
        dummy.position.set(x * drawwidth, y * drawheight, 0)
        dummy.updateMatrix()
        meshes.setMatrixAt(c, dummy.matrix)
        // update char drawn
        dummycolor.set(char[i], color[i], bg[i])
        meshes.setColorAt(c, dummycolor)
        // update cursor
        ++c
      }
      // next
      ++x
      if (x >= width) {
        x = 0
        ++y
      }
    }
    meshes.count = c
    meshes.instanceMatrix.needsUpdate = true
    if (ispresent(meshes.instanceColor)) {
      meshes.instanceColor.needsUpdate = true
    }
    meshes.computeBoundingBox()
    meshes.computeBoundingSphere()
    meshes.visible = !!meshes.count
  }, [meshes, char, color, bg, width])

  return (
    <instancedMesh ref={setmeshes} args={[undefined, undefined, limit]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
