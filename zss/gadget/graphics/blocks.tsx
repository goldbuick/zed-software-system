import { useEffect, useMemo, useState } from 'react'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'

import { createBlocksMaterial } from '../display/blocks'
import {
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from '../display/dither'
import { useMedia } from '../hooks'

export function ShadowMesh() {
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const [material] = useState(() => createDitherMaterial())

  const width = 1
  const height = 1
  const alphas = useMemo(
    () => new Array(width * height).fill(0.25),
    [width, height],
  )

  useEffect(() => {
    material.uniforms.data.value = createDitherDataTexture(width, height)
  }, [material.uniforms.data, width, height])

  // set data texture
  useEffect(() => {
    updateDitherDataTexture(material.uniforms.data.value, width, height, alphas)
  }, [material, material.uniforms.data.value, width, height, alphas])

  return (
    <>
      <boxGeometry args={[drawwidth, drawwidth, drawwidth]} />
      {/* <meshBasicMaterial color="grey" /> */}
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
