import { useObservableDeep } from '@zss/yjs/binding'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferGeometry } from 'three'

import { useClipping } from '../clipping'
import { getDLState } from '../data/dither'
import {
  createDitherDataTexture,
  createDitherMaterial,
  updateDitherDataTexture,
} from '../img/dither'
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
  const bgRef = useRef<BufferGeometry>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  // track state changes
  useObservableDeep(layer, () => {
    if (!bgRef.current) {
      return
    }

    const state = getDLState(layer)
    // console.info(state)

    if (state.width !== width) {
      setWidth(state.width)
    }

    if (state.height !== height) {
      setHeight(state.height)
    }

    if (material.uniforms.data.value) {
      // update data texture with current chars
      updateDitherDataTexture(
        material.uniforms.data.value,
        state.width,
        state.height,
        state.alpha,
      )
    } else {
      // create data texture with current chars
      material.uniforms.data.value = createDitherDataTexture(
        state.width,
        state.height,
        state.alpha,
      )
    }

    // update single quad to proper size
    const count = bgRef.current?.attributes.position?.count ?? 0
    if (bgRef.current && count !== state.width * state.height * 4) {
      createTilemapBufferGeometry(bgRef.current, state.width, state.height)
    }
  })

  const clippingPlanes = useClipping()
  const material = useMemo(() => createDitherMaterial(), [])

  // config material
  useEffect(() => {
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [material, width, height, clippingPlanes])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
