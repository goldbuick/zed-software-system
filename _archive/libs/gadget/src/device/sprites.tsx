import { useObservableDeep } from '@zss/yjs/binding'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

import { useClipping } from '../clipping'
import { getSLState } from '../data/sprites'
import { time } from '../img/anim'
import defaultCharSetUrl from '../img/charSet.png'
import { createSpritesMaterial } from '../img/sprites'
import { TILE_FIXED_COLS, TILE_IMAGE_SIZE } from '../img/types'
import useTexture from '../img/useTexture'

import { LayerProps } from './types'

export function Sprites({ layer }: LayerProps) {
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
    let charData = current.getAttribute('charData') as
      | BufferAttribute
      | undefined
    let lastPosition = current.getAttribute('lastPosition') as
      | BufferAttribute
      | undefined
    let lastColor = current.getAttribute('lastColor') as
      | BufferAttribute
      | undefined
    let lastBg = current.getAttribute('lastBg') as BufferAttribute | undefined
    let animShake = current.getAttribute('animShake') as
      | BufferAttribute
      | undefined
    let animBounce = current.getAttribute('animBounce') as
      | BufferAttribute
      | undefined

    if (
      !position ||
      !charData ||
      !lastPosition ||
      !lastColor ||
      !lastBg ||
      !animShake ||
      !animBounce
    ) {
      // init data
      position = new BufferAttribute(new Float32Array(countData * 3), 3)
      charData = new BufferAttribute(new Float32Array(countData * 4), 4)
      lastPosition = new BufferAttribute(new Float32Array(countData * 3), 3)
      lastColor = new BufferAttribute(new Float32Array(countData * 2), 2)
      lastBg = new BufferAttribute(new Float32Array(countData * 2), 2)
      animShake = new BufferAttribute(new Float32Array(countData * 2), 2)
      animBounce = new BufferAttribute(new Float32Array(countData * 2), 2)

      for (let i = 0; i < state.sprites.length; ++i) {
        const sprite = state.sprites[i]
        position.setXY(i, sprite.x, sprite.y)
        charData.setXYZW(
          i,
          sprite.char % TILE_FIXED_COLS,
          Math.floor(sprite.char / TILE_FIXED_COLS),
          sprite.color,
          sprite.bg,
        )
        lastPosition.setXYZ(i, sprite.x, sprite.y, time.value)
        lastColor.setXY(i, sprite.color, time.value)
        lastBg.setXY(i, sprite.bg, time.value)
        animShake.setXY(i, 0, time.value - 1000000)
        animBounce.setXY(i, 0, time.value - 1000000)
      }

      current.setAttribute('position', position)
      current.setAttribute('charData', charData)
      current.setAttribute('lastPosition', lastPosition)
      current.setAttribute('lastColor', lastColor)
      current.setAttribute('lastBg', lastBg)
      current.setAttribute('animShake', animShake)
      current.setAttribute('animBounce', animBounce)
    } else {
      // update data
      for (let i = 0; i < state.sprites.length; ++i) {
        const sprite = state.sprites[i]
        const cx = position.getX(i)
        const cy = position.getY(i)
        const ccharu = charData.getX(i)
        const ccharv = charData.getY(i)
        const ccolor = charData.getZ(i)
        const cbg = charData.getW(i)

        if (cx !== sprite.x || cy !== sprite.y) {
          lastPosition.setXYZ(i, cx, cy, time.value)
          lastPosition.needsUpdate = true

          position.setXY(i, sprite.x, sprite.y)
          position.needsUpdate = true
        }

        if (ccolor !== sprite.color) {
          lastColor.setXY(i, ccolor, time.value)
          lastColor.needsUpdate = true

          charData.setZ(i, sprite.color)
          charData.needsUpdate = true
        }

        if (cbg !== sprite.bg) {
          lastBg.setXY(i, cbg, time.value)
          lastBg.needsUpdate = true

          charData.setW(i, sprite.bg)
          charData.needsUpdate = true
        }

        // todo, detect animBounce & animShake triggers
        if (Math.random() * 1000 < 10) {
          if (Math.random() * 10 <= 5) {
            animShake.setXY(i, Math.random(), time.value)
            animShake.needsUpdate = true
          } else {
            animBounce.setXY(i, Math.random(), time.value)
            animBounce.needsUpdate = true
          }
        }

        const ncharu = sprite.char % TILE_FIXED_COLS
        const ncharv = Math.floor(sprite.char / TILE_FIXED_COLS)
        if (ccharu !== ncharu || ccharv !== ncharv) {
          charData.setXY(i, ncharu, ncharv)
          charData.needsUpdate = true
        }
      }
    }
  })

  const clippingPlanes = useClipping()
  const material = useMemo(() => createSpritesMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } = map.image ?? {}

  // config material
  useEffect(() => {
    if (!map) {
      return
    }
    const imageCols = Math.round(imageWidth / TILE_IMAGE_SIZE)
    const imageRows = Math.round(imageHeight / TILE_IMAGE_SIZE)
    material.transparent = true
    material.uniforms.map.value = map
    material.uniforms.alt.value = map // alt
    material.uniforms.rows.value = imageRows - 1
    material.uniforms.step.value.x = 1 / imageCols
    material.uniforms.step.value.y = 1 / imageRows
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
