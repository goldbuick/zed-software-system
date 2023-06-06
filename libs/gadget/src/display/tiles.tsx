import { useObservableDeep } from '@zss/yjs/binding'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferGeometry } from 'three'

import { useClipping } from '../clipping'
import { getTLState } from '../data/tiles'
import defaultCharSetUrl from '../img/charSet.png'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from '../img/tiles'
import { TILE_IMAGE_SIZE } from '../img/types'
import useTexture from '../img/useTexture'

import { LayerProps } from './types'

export function Tiles({ id, layer }: LayerProps) {
  // test code begin
  const map = useTexture(defaultCharSetUrl)
  // test code end

  const bgRef = useRef<BufferGeometry>(null)
  const [dimmed, setDimmed] = useState(false)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  // track state changes
  useObservableDeep(layer, () => {
    if (!bgRef.current) {
      return
    }

    const state = getTLState(layer)
    // console.info(state)

    if (state.dimmed !== dimmed) {
      setDimmed(state.dimmed)
    }

    if (state.width !== width) {
      setWidth(state.width)
    }

    if (state.height !== height) {
      setHeight(state.height)
    }

    if (material.uniforms.data.value) {
      // update data texture with current chars
      updateTilemapDataTexture(
        material.uniforms.data.value,
        state.width,
        state.height,
        state.char,
        state.color,
      )
    } else {
      // create data texture with current chars
      material.uniforms.data.value = createTilemapDataTexture(
        state.width,
        state.height,
        state.char,
        state.color,
      )
    }

    // update single quad to proper size
    const count = bgRef.current?.attributes.position?.count ?? 0
    if (bgRef.current && count !== state.width * state.height * 4) {
      createTilemapBufferGeometry(bgRef.current, state.width, state.height)
    }
  })

  const clippingPlanes = useClipping()
  const material = useMemo(() => createTilemapMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } = map.image ?? {}

  // config material
  useEffect(() => {
    if (!map) {
      return
    }
    // console.info('config material')
    const strokeWidth = 0.8
    const outline = false
    material.transparent = dimmed || outline
    material.uniforms.map.value = map
    material.uniforms.alt.value = map // alt
    material.uniforms.dimmed.value = dimmed ? 0.5 : 0
    material.uniforms.transparent.value = outline
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.uniforms.step.value.x =
      1 / Math.round(imageWidth / TILE_IMAGE_SIZE)
    material.uniforms.step.value.y =
      1 / Math.round(imageHeight / TILE_IMAGE_SIZE)
    material.uniforms.ox.value = (1 / imageWidth) * strokeWidth
    material.uniforms.oy.value = (1 / imageHeight) * strokeWidth
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [
    map,
    material,
    dimmed,
    width,
    height,
    imageWidth,
    imageHeight,
    clippingPlanes,
  ])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
