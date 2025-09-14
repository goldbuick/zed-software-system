/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { COLLISION, COLOR } from 'zss/words/types'

import { createBlocksMaterial } from '../display/blocks'
import {
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
    material.uniforms.rows.value = imageRows - 1
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
    material.uniforms.rows.value = imageRows - 1
    material.uniforms.step.value.x = 1 / imageCols
    material.uniforms.step.value.y = 1 / imageRows
    material.needsUpdate = true
  }, [palette, charset, altcharset, material, imageWidth, imageHeight])

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createBillboardBufferGeometryAttributes(1, 1),
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
    material.uniforms.rows.value = imageRows - 1
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
