import { useEffect, useState } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { RUNTIME } from 'zss/config'
import { indextopt } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE } from 'zss/memory/types'

import { createdarknessmaterial } from '../display/blocks'

type DarknessMeshesProps = {
  width: number
  alphas: number[]
  limit?: number
}

const dummy = new Object3D()
const dummycolor = new Color()

export function DarknessMeshes({
  width,
  alphas,
  limit = BOARD_SIZE,
}: DarknessMeshesProps) {
  const [material] = useState(() => createdarknessmaterial())
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  // process tiles
  const [meshes, setmeshes] = useState<InstancedMesh>()
  useEffect(() => {
    if (!ispresent(meshes)) {
      return
    }
    let c = 0
    const rr = 8 / 14
    for (let i = 0; i < alphas.length; ++i) {
      const pt = indextopt(i, width)
      const alpha = alphas[i]
      if (alpha !== 0) {
        dummy.position.set(
          (pt.x + 0.5) * drawwidth + rr,
          (pt.y + 0.5) * drawheight - 1,
          drawheight * -0.5,
        )
        dummy.updateMatrix()
        meshes.setMatrixAt(c, dummy.matrix)
        dummycolor.set(alpha, 0, 0)
        meshes.setColorAt(c, dummycolor)
        ++c
      }
    }
    meshes.count = c
    meshes.instanceMatrix.needsUpdate = true
    if (ispresent(meshes.instanceColor)) {
      meshes.instanceColor.needsUpdate = true
    }
    meshes.computeBoundingBox()
    meshes.computeBoundingSphere()
  }, [meshes, alphas, width, drawwidth, drawheight])

  return (
    <instancedMesh ref={setmeshes} args={[null, null, limit]}>
      <boxGeometry args={[drawwidth, drawheight, drawheight]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
