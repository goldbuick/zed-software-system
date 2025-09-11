import { useEffect, useState } from 'react'
import { DoubleSide } from 'three'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'

import { createBlocksMaterial } from '../display/blocks'
import { useMedia } from '../hooks'

export function ShadowMesh() {
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  return (
    <>
      <boxGeometry args={[drawwidth, drawwidth, 2]} />
      <meshBasicMaterial color="grey" side={DoubleSide} />
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
