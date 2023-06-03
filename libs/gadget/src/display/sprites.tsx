import { useObservableDeep } from '@zss/yjs/binding'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

import { useClipping } from '../clipping'
import { getSLState } from '../data/layer'
import { time } from '../img/anim'
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

    // get sprite count
    const state = getSLState(layer)
    const countData = state.sprites.length

    // get data
    let position = current.getAttribute('position') as
      | BufferAttribute
      | undefined
    let offset = current.getAttribute('offset') as BufferAttribute | undefined
    let lastPosition = current.getAttribute('lastPosition') as
      | BufferAttribute
      | undefined
    let lastColor = current.getAttribute('lastColor') as
      | BufferAttribute
      | undefined

    if (!position || !offset || !lastPosition || !lastColor) {
      // init data
      position = new BufferAttribute(new Float32Array(countData * 3), 3)
      offset = new BufferAttribute(new Float32Array(countData * 3), 3)
      lastPosition = new BufferAttribute(new Float32Array(countData * 3), 3)
      lastColor = new BufferAttribute(new Float32Array(countData * 3), 3)

      for (let i = 0; i < state.sprites.length; ++i) {
        const sprite = state.sprites[i]
        position.setXY(i, sprite.x, sprite.y)
        offset.setXYZ(
          i,
          sprite.char % TILE_FIXED_WIDTH,
          Math.floor(sprite.char / TILE_FIXED_WIDTH),
          sprite.color,
        )
        lastPosition.setXYZ(i, sprite.x, sprite.y, time.value)
        lastColor.setXY(i, sprite.color, time.value)
      }

      current.setAttribute('position', position)
      current.setAttribute('offset', offset)
      current.setAttribute('lastPosition', lastPosition)
      current.setAttribute('lastColor', lastColor)
    } else {
      // update data
      for (let i = 0; i < state.sprites.length; ++i) {
        const sprite = state.sprites[i]
        const cx = position.getX(i)
        const cy = position.getY(i)
        const ccharu = offset.getX(i)
        const ccharv = offset.getY(i)
        const ccolor = offset.getZ(i)

        if (cx !== sprite.x || cy !== sprite.y) {
          lastPosition.setXYZ(i, cx, cy, time.value)
          lastPosition.needsUpdate = true

          position.setXY(i, sprite.x, sprite.y)
          position.needsUpdate = true
        }

        if (ccolor !== sprite.color) {
          lastColor.setXY(i, ccolor, time.value)
          lastColor.needsUpdate = true

          offset.setZ(i, sprite.color)
          offset.needsUpdate = true
        }

        const ncharu = sprite.char % TILE_FIXED_WIDTH
        const ncharv = Math.floor(sprite.char / TILE_FIXED_WIDTH)
        if (ccharu !== ncharu || ccharv !== ncharv) {
          offset.setXY(i, ncharu, ncharv)
          offset.needsUpdate = true
        }
      }
    }
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
