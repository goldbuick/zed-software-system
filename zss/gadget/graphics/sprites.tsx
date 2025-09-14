import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH, SPRITE } from 'zss/gadget/data/types'
import { createBillboardsMaterial } from 'zss/gadget/display/billboards'
import { createSpritesMaterial } from 'zss/gadget/display/sprites'

import { useMedia } from '../hooks'

import { SpriteGeometry } from './spritegeometry'

type SpritesProps = {
  sprites: SPRITE[]
  scale?: number
  fliptexture?: boolean
  withbillboards?: boolean
}

export function Sprites({
  sprites,
  scale = 1,
  fliptexture = true,
  withbillboards = false,
}: SpritesProps) {
  const { viewport } = useThree()
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.spritecharsetdata)
  const altcharset = useMedia((state) => state.spritealtcharsetdata)
  const material = useMemo(
    () =>
      withbillboards ? createBillboardsMaterial() : createSpritesMaterial(),
    [withbillboards],
  )

  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charset?.image ?? {}

  // config material
  useEffect(() => {
    if (!charset) {
      return
    }
    const padwidth = CHAR_WIDTH + 2
    const padheight = CHAR_HEIGHT + 2
    const imageRows = Math.round(imageHeight / padheight)
    material.uniforms.palette.value = palette
    material.uniforms.map.value = charset
    material.uniforms.alt.value = altcharset ?? charset
    material.uniforms.dpr.value = scale
    material.uniforms.screenwidth.value = viewport.width
    material.uniforms.screenheight.value = viewport.height
    material.uniforms.rows.value = imageRows - 1
    material.uniforms.step.value.x = padwidth
    material.uniforms.step.value.y = padheight
    material.uniforms.size.value.x = CHAR_WIDTH
    material.uniforms.size.value.y = CHAR_HEIGHT
    material.uniforms.pixel.value.x = 1 / imageWidth
    material.uniforms.pixel.value.y = 1 / imageHeight
    material.uniforms.pointSize.value.x = RUNTIME.DRAW_CHAR_WIDTH()
    material.uniforms.pointSize.value.y = RUNTIME.DRAW_CHAR_HEIGHT()
    material.uniforms.flip.value = fliptexture
    material.needsUpdate = true
  }, [
    palette,
    charset,
    altcharset,
    material,
    imageWidth,
    imageHeight,
    fliptexture,
    viewport.width,
    viewport.height,
    scale,
  ])

  return (
    <points frustumCulled={false}>
      <SpriteGeometry sprites={sprites} />
      <primitive object={material} attach="material" />
    </points>
  )
}
