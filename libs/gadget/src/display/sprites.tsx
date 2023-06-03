import { useObservableDeep } from '@zss/yjs/binding'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

import { useClipping } from '../clipping'
import { getSLState } from '../data/layer'
import { createPointsMaterial } from '../img/points'
import { TILE_FIXED_WIDTH, TILE_IMAGE_SIZE, TILE_SIZE } from '../img/types'
import useTexture from '../img/useTexture'

import defaultCharSetUrl from './charSet.png'
import { LayerProps } from './types'

export function Sprites({ id, layer }: LayerProps) {
  // test code begin
  const map = useTexture(defaultCharSetUrl)
  // test code end

  const bgRef = useRef<BufferGeometry>(null)

  // track state changes
  useObservableDeep(layer, () => {
    const { current } = bgRef
    if (!current) {
      return
    }

    const state = getSLState(layer)
    const countData = state.sprites.length
    const position = new Float32Array(countData * 3)
    const offset = new Float32Array(countData * 3)

    // config attributes
    for (let i = 0, p = 0, o = 0; i < state.sprites.length; ++i) {
      const sprite = state.sprites[i]
      position[p++] = sprite.x + 0.5
      position[p++] = sprite.y + 0.5
      position[p++] = 0
      offset[o++] = sprite.char % TILE_FIXED_WIDTH
      offset[o++] = Math.floor(sprite.char / TILE_FIXED_WIDTH)
      offset[o++] = sprite.color
    }

    current.setAttribute('position', new BufferAttribute(position, 3))
    current.setAttribute('offset', new BufferAttribute(offset, 3))
  })

  const clippingPlanes = useClipping()
  const material = useMemo(() => createPointsMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } = map.image ?? {}

  // config material
  useEffect(() => {
    if (!map) {
      return
    }
    // console.info('config material')
    const strokeWidth = 0.8
    const imageCols = Math.round(imageWidth / TILE_IMAGE_SIZE)
    const imageRows = Math.round(imageHeight / TILE_IMAGE_SIZE)
    material.transparent = true
    material.uniforms.map.value = map
    material.uniforms.alt.value = map // alt
    material.uniforms.rows.value = imageRows - 1
    material.uniforms.step.value.x = 1 / imageCols
    material.uniforms.step.value.y = 1 / imageRows
    material.uniforms.pointSize.value = TILE_SIZE
    material.uniforms.ox.value = (1 / imageWidth) * strokeWidth
    material.uniforms.oy.value = (1 / imageHeight) * strokeWidth
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [map, material, imageWidth, imageHeight, clippingPlanes])

  return (
    <points material={material}>
      <bufferGeometry ref={bgRef} />
    </points>
  )
}
