import { useFrame } from '@react-three/fiber'
import React, { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
} from 'three'

import { range, select } from '/zss/mapping/array'
import { clamp, randomInteger } from '/zss/mapping/number'

import { CHARS_PER_ROW, CHAR_HEIGHT, CHAR_WIDTH, SPRITES_SPRITE } from '../data'
import { convertPaletteToColors } from '../data/palette'
import { time } from '../display/anim'
import { createSpritesMaterial } from '../display/sprites'
import useBitmapTexture from '../display/textures'
import { loadDefaultCharset, loadDefaultPalette } from '../file'

import { useClipping } from './clipping'

const rate = 0.1
let tick = rate
const rangeX = 79
const rangeY = 24
const sprites: SPRITES_SPRITE[] = range(100 - 1).map(() => ({
  x: randomInteger(0, rangeX),
  y: randomInteger(0, rangeY),
  char: randomInteger(1, 15),
  color: randomInteger(8, 15),
  bg: select(-1, -1, 0),
}))

const charset = loadDefaultCharset()
const palette = loadDefaultPalette()

type MaybeBufferAttr = BufferAttribute | InterleavedBufferAttribute | undefined

export function Sprites() {
  const charsetTexture = useBitmapTexture(charset?.bitmap)
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const material = useMemo(() => createSpritesMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charsetTexture?.image ?? {}

  // config material
  useEffect(() => {
    if (!charsetTexture || !bgRef.current) {
      return
    }

    const imageCols = Math.round(imageWidth / CHAR_WIDTH)
    const imageRows = Math.round(imageHeight / CHAR_HEIGHT)
    const paletteColors = convertPaletteToColors(palette)

    material.transparent = true
    material.uniforms.map.value = charsetTexture
    material.uniforms.alt.value = charsetTexture // alt
    material.uniforms.palette.value = paletteColors
    material.uniforms.rows.value = imageRows - 1
    material.uniforms.step.value.x = 1 / imageCols
    material.uniforms.step.value.y = 1 / imageRows
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [charsetTexture, material, imageWidth, imageHeight, clippingPlanes])

  // config data
  useFrame((state, delta) => {
    const { current } = bgRef
    if (!current) {
      return
    }

    // trigger at rate
    tick += delta
    if (tick < rate) {
      return
    }
    tick -= rate

    // get data
    let position: MaybeBufferAttr = current.getAttribute('position')
    let charData: MaybeBufferAttr = current.getAttribute('charData')
    let lastPosition: MaybeBufferAttr = current.getAttribute('lastPosition')
    let lastColor: MaybeBufferAttr = current.getAttribute('lastColor')
    let lastBg: MaybeBufferAttr = current.getAttribute('lastBg')
    let animShake: MaybeBufferAttr = current.getAttribute('animShake')
    let animBounce: MaybeBufferAttr = current.getAttribute('animBounce')

    for (let i = 0; i < 32; ++i) {
      const e = randomInteger(0, sprites.length - 1)
      sprites[e].x = clamp(sprites[e].x + randomInteger(-1, 1), 0, rangeX)
      sprites[e].y = clamp(sprites[e].y + randomInteger(-1, 1), 0, rangeY)
    }

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
      position = new BufferAttribute(new Float32Array(sprites.length * 3), 3)
      charData = new BufferAttribute(new Float32Array(sprites.length * 4), 4)
      lastPosition = new BufferAttribute(
        new Float32Array(sprites.length * 3),
        3,
      )
      lastColor = new BufferAttribute(new Float32Array(sprites.length * 2), 2)
      lastBg = new BufferAttribute(new Float32Array(sprites.length * 2), 2)
      animShake = new BufferAttribute(new Float32Array(sprites.length * 2), 2)
      animBounce = new BufferAttribute(new Float32Array(sprites.length * 2), 2)

      for (let i = 0; i < sprites.length; ++i) {
        const sprite = sprites[i]
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

        const ncharu = sprite.char % CHARS_PER_ROW
        const ncharv = Math.floor(sprite.char / CHARS_PER_ROW)
        if (ccharu !== ncharu || ccharv !== ncharv) {
          charData.setXY(i, ncharu, ncharv)
          charData.needsUpdate = true
        }
      }
    }
  })

  return (
    <points material={material}>
      <bufferGeometry ref={bgRef} />
    </points>
  )
}