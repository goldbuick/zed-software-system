/* eslint-disable react-refresh/only-export-components */
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
} from 'three'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH, SPRITE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { COLLISION, COLOR } from 'zss/words/types'

import { time } from '../display/anim'
import { createBlocksMaterial, createdarknessmaterial } from '../display/blocks'
import {
  createBlockDitherMaterial,
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from '../display/dither'
import {
  createBillboardBufferGeometryAttributes,
  createPillarBufferGeometryAttributes,
  createTilemapBufferGeometryAttributes,
} from '../display/tiles'
import { useMedia } from '../hooks'

type BlockShadowMeshesProps = {
  sprites: SPRITE[]
  limit: number
}

const dummy = new Object3D()
const dummymat = new Matrix4()

export function BlockShadowMeshes({ sprites, limit }: BlockShadowMeshesProps) {
  const [meshes, setMeshes] = useState<InstancedMesh>()
  const [nowposition, setnowposition] = useState<InstancedBufferAttribute>()
  const [lastmatrix, setlastmatrix] = useState<InstancedBufferAttribute>()
  const [material] = useState(() => createBlockDitherMaterial())

  useLayoutEffect(() => {
    material.uniforms.data.value = createDitherDataTexture(1, 1)
  }, [material.uniforms.data])

  // set data texture
  useLayoutEffect(() => {
    updateDitherDataTexture(material.uniforms.data.value, 1, 1, [0.5])
  }, [material, material.uniforms.data.value])

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createTilemapBufferGeometryAttributes(1, 1),
    [],
  )

  const nowpositionarray = useMemo(() => new Float32Array(limit * 3), [limit])
  const lastmatrixarray = useMemo(() => new Float32Array(limit * 16), [limit])

  // process sprites
  useLayoutEffect(() => {
    if (
      !ispresent(meshes) ||
      !ispresent(nowposition) ||
      !ispresent(lastmatrix)
    ) {
      return
    }
    const rr = 8 / 14
    const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
    meshes.count = sprites.length

    for (let i = 0; i < sprites.length; ++i) {
      const sprite = sprites[i]

      // write current pos
      const nowx = sprite.x * drawwidth
      const nowy = (sprite.y + 0.25) * drawheight

      // animate movement
      if (nowposition.getX(i) !== nowx || nowposition.getY(i) !== nowy) {
        meshes.getMatrixAt(i, dummymat)
        lastmatrix.set(dummymat.toArray(), i * 16)
        lastmatrix.needsUpdate = true

        nowposition.setXYZ(i, nowx, nowy, time.value)
        nowposition.needsUpdate = true

        dummy.scale.set(1, rr, 1)
        dummy.position.set(nowx, nowy, drawheight * -0.75 + 0.5)
        dummy.updateMatrix()

        meshes.setMatrixAt(i, dummy.matrix)
      }
    }
    meshes.instanceMatrix.needsUpdate = true
    meshes.computeBoundingBox()
    meshes.computeBoundingSphere()
  }, [sprites, meshes, nowposition, lastmatrix])

  return (
    <instancedMesh ref={setMeshes} args={[null, null, limit]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
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

export function ShadowMesh() {
  const [material] = useState(() => createDitherMaterial())

  useEffect(() => {
    material.uniforms.data.value = createDitherDataTexture(1, 1)
  }, [material.uniforms.data])

  // set data texture
  useEffect(() => {
    updateDitherDataTexture(material.uniforms.data.value, 1, 1, [0.5])
  }, [material, material.uniforms.data.value])

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createTilemapBufferGeometryAttributes(1, 1),
    [],
  )

  return (
    <>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </>
  )
}

export function PillarMesh() {
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
  const { position, uv } = useMemo(
    () => createPillarBufferGeometryAttributes(1, 1),
    [],
  )

  return (
    <>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </>
  )
}

export function BillboardMesh() {
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.charsetdata)
  const altcharset = useMedia((state) => state.altcharsetdata)
  const [material] = useState(() => createBlocksMaterial())

  // const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  // const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
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

  return (
    <>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </>
  )
}

export function BlockMesh() {
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.charsetdata)
  const altcharset = useMedia((state) => state.altcharsetdata)
  const [material] = useState(() => createBlocksMaterial())

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
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

  return (
    <>
      <boxGeometry args={[drawwidth, drawheight, drawheight]} />
      <primitive object={material} attach="material" />
    </>
  )
}

export function DarknessMesh() {
  const [material] = useState(() => createdarknessmaterial())
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  return (
    <>
      <boxGeometry args={[drawwidth, drawheight, drawheight]} />
      <primitive object={material} attach="material" />
    </>
  )
}

export function filterlayer2floor(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return 0
      }
      return v
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return COLOR.ONCLEAR
      }
      return v
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return COLOR.ONCLEAR
      }
      return v
    }),
  }
}

export function filterlayer2walls(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSOLID:
          return v
      }
      return 0
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSOLID:
          return v
      }
      return 0
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSOLID:
          return v
      }
      return COLOR.ONCLEAR
    }),
  }
}

export function filterlayer2water(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return 176
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return COLOR.DKGRAY
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return COLOR.BLACK
    }),
  }
}
