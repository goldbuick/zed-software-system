import { useEffect, useRef, useState } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
} from 'three'
import {
  CHARS_PER_ROW,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  SPRITE,
} from 'zss/gadget/data/types'
import { time } from 'zss/gadget/display/anim'
import { createSpritesMaterial } from 'zss/gadget/display/sprites'
import useBitmapTexture from 'zss/gadget/display/textures'
import { loadDefaultCharset } from 'zss/gadget/file/bytes'

import { useClipping } from '../clipping'

type MaybeBufferAttr = BufferAttribute | InterleavedBufferAttribute | undefined

type SpritesProps = {
  sprites: SPRITE[]
}

const charset = loadDefaultCharset()

const SPRITE_COUNT = 2048

export function Sprites({ sprites }: SpritesProps) {
  const charsetTexture = useBitmapTexture(charset)
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const [material] = useState(() => createSpritesMaterial())
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charsetTexture?.image ?? {}

  useEffect(() => {
    const { current } = bgRef
    if (!current) {
      return
    }

    // get data
    let visible: MaybeBufferAttr = current.getAttribute('visible')
    let lastVisible: MaybeBufferAttr = current.getAttribute('lastVisible')
    let position: MaybeBufferAttr = current.getAttribute('position')
    let charData: MaybeBufferAttr = current.getAttribute('charData')
    let lastPosition: MaybeBufferAttr = current.getAttribute('lastPosition')
    let lastColor: MaybeBufferAttr = current.getAttribute('lastColor')
    let lastBg: MaybeBufferAttr = current.getAttribute('lastBg')
    let animShake: MaybeBufferAttr = current.getAttribute('animShake')
    let animBounce: MaybeBufferAttr = current.getAttribute('animBounce')

    // create
    if (
      !visible ||
      visible.count !== SPRITE_COUNT ||
      !position ||
      position.count !== SPRITE_COUNT ||
      !charData ||
      charData.count !== SPRITE_COUNT ||
      !lastPosition ||
      lastPosition.count !== SPRITE_COUNT ||
      !lastColor ||
      lastColor.count !== SPRITE_COUNT ||
      !lastBg ||
      lastBg.count !== SPRITE_COUNT ||
      !animShake ||
      animShake.count !== SPRITE_COUNT ||
      !animBounce ||
      animBounce.count !== SPRITE_COUNT
    ) {
      // init data
      visible = new BufferAttribute(new Float32Array(SPRITE_COUNT), 1)
      lastVisible = new BufferAttribute(new Float32Array(SPRITE_COUNT), 1)
      position = new BufferAttribute(new Float32Array(SPRITE_COUNT * 3), 3)
      charData = new BufferAttribute(new Float32Array(SPRITE_COUNT * 4), 4)
      lastPosition = new BufferAttribute(new Float32Array(SPRITE_COUNT * 3), 3)
      lastColor = new BufferAttribute(new Float32Array(SPRITE_COUNT * 2), 2)
      lastBg = new BufferAttribute(new Float32Array(SPRITE_COUNT * 2), 2)
      animShake = new BufferAttribute(new Float32Array(SPRITE_COUNT * 2), 2)
      animBounce = new BufferAttribute(new Float32Array(SPRITE_COUNT * 2), 2)

      for (let i = 0; i < sprites.length; ++i) {
        const sprite = sprites[i]
        visible.setX(i, 1)
        lastVisible.setX(i, 1)
        position.setXY(i, sprite.x, sprite.y)
        charData.setXYZW(
          i,
          sprite.char % CHARS_PER_ROW,
          Math.floor(sprite.char / CHARS_PER_ROW),
          sprite.color,
          sprite.bg,
        )
        lastPosition.setXYZ(i, sprite.x, sprite.y, time.value)
        lastColor.setXY(i, sprite.color, time.value)
        lastBg.setXY(i, sprite.bg, time.value)
        animShake.setXY(i, 0, time.value - 1000000)
        animBounce.setXY(i, 0, time.value - 1000000)
      }
      for (let i = sprites.length; i < SPRITE_COUNT; ++i) {
        visible.setX(i, 0)
        lastVisible.setX(i, 0)
      }

      current.setAttribute('visible', visible)
      current.setAttribute('lastVisible', lastVisible)
      current.setAttribute('position', position)
      current.setAttribute('charData', charData)
      current.setAttribute('lastPosition', lastPosition)
      current.setAttribute('lastColor', lastColor)
      current.setAttribute('lastBg', lastBg)
      current.setAttribute('animShake', animShake)
      current.setAttribute('animBounce', animBounce)
    } else {
      // update data
      for (let i = 0; i < sprites.length; ++i) {
        const sprite = sprites[i]
        const cx = position.getX(i)
        const cy = position.getY(i)
        const ccharu = charData.getX(i)
        const ccharv = charData.getY(i)
        const ccolor = charData.getZ(i)
        const cbg = charData.getW(i)

        // check for first frame
        const firstframe = lastVisible.getX(i) === 0

        // update visible
        lastVisible.setX(i, visible.getX(i))
        visible.setX(i, 1)

        if (firstframe || cx !== sprite.x || cy !== sprite.y) {
          lastPosition.setXYZ(
            i,
            firstframe ? sprite.x : cx,
            firstframe ? sprite.y : cy,
            time.value,
          )
          lastPosition.needsUpdate = true

          position.setXY(i, sprite.x, sprite.y)
          position.needsUpdate = true
        }

        if (ccolor !== sprite.color) {
          lastColor.setXY(i, firstframe ? sprite.color : ccolor, time.value)
          lastColor.needsUpdate = true

          charData.setZ(i, sprite.color)
          charData.needsUpdate = true
        }

        if (cbg !== sprite.bg) {
          lastBg.setXY(i, firstframe ? sprite.bg : cbg, time.value)
          lastBg.needsUpdate = true

          charData.setW(i, sprite.bg)
          charData.needsUpdate = true
        }

        // todo, detect ??
        // animBounce & animShake triggers

        const ncharu = sprite.char % CHARS_PER_ROW
        const ncharv = Math.floor(sprite.char / CHARS_PER_ROW)
        if (ccharu !== ncharu || ccharv !== ncharv) {
          charData.setXY(i, ncharu, ncharv)
          charData.needsUpdate = true
        }
      }
      // clear remaining sprites
      for (let i = sprites.length; i < SPRITE_COUNT; ++i) {
        if (visible.getX(i) !== lastVisible.getX(i)) {
          lastVisible.setX(i, visible.getX(i))
        }
        visible.setX(i, 0)
      }
      visible.needsUpdate = true
      lastVisible.needsUpdate = true
    }

    current.computeBoundingBox()
    current.computeBoundingSphere()
  }, [sprites])

  // config material
  useEffect(() => {
    if (!charsetTexture || !bgRef.current) {
      return
    }
    const imageCols = Math.round(imageWidth / CHAR_WIDTH)
    const imageRows = Math.round(imageHeight / CHAR_HEIGHT)

    material.uniforms.rows.value = imageRows - 1
    material.uniforms.step.value.x = 1 / imageCols
    material.uniforms.step.value.y = 1 / imageRows
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [charsetTexture, material, imageWidth, imageHeight, clippingPlanes])

  return (
    <points frustumCulled={false} material={material}>
      <bufferGeometry ref={bgRef} />
    </points>
  )
}
