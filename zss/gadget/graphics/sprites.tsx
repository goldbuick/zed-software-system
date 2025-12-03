import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { RUNTIME } from 'zss/config'
import {
  CHARS_PER_ROW,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  SPRITE,
} from 'zss/gadget/data/types'
import { createBillboardsMaterial } from 'zss/gadget/display/billboards'
import { createSpritesMaterial } from 'zss/gadget/display/sprites'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE } from 'zss/memory/types'

import { time } from '../display/anim'
import { useSpritePool } from '../display/spritepool'
import { useMedia } from '../hooks'

type SpritesProps = {
  sprites: SPRITE[]
  scale?: number
  withbillboards?: boolean
  limit?: number
}

export function Sprites({
  sprites,
  scale = 1,
  withbillboards = false,
  limit = BOARD_SIZE,
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
    material.uniforms.flip.value = false
    material.needsUpdate = true
  }, [
    palette,
    charset,
    altcharset,
    material,
    imageWidth,
    imageHeight,
    viewport.width,
    viewport.height,
    scale,
  ])

  const [buffer, setbuffer] = useState<BufferGeometry>()
  const [spritepool, range] = useSpritePool(sprites, limit)

  const visiblearray = useMemo(() => new Uint8Array(limit), [limit])
  const positionarray = useMemo(() => new Float32Array(limit * 3), [limit])
  const lastpositionarray = useMemo(() => new Float32Array(limit * 3), [limit])
  const displayarray = useMemo(() => new Float32Array(limit * 4), [limit])
  const lastcolorarray = useMemo(() => new Float32Array(limit * 2), [limit])
  const lastbgarray = useMemo(() => new Float32Array(limit * 2), [limit])

  const [visible, setvisible] = useState<BufferAttribute>()
  const [position, setposition] = useState<BufferAttribute>()
  const [lastposition, setlastposition] = useState<BufferAttribute>()
  const [display, setdisplay] = useState<BufferAttribute>()
  const [lastcolor, setlastcolor] = useState<BufferAttribute>()
  const [lastbg, setlastbg] = useState<BufferAttribute>()

  useEffect(() => {
    if (
      !ispresent(buffer) ||
      !ispresent(visible) ||
      !ispresent(position) ||
      !ispresent(lastposition) ||
      !ispresent(display) ||
      !ispresent(lastcolor) ||
      !ispresent(lastbg)
    ) {
      return
    }

    for (let i = 0; i < spritepool.length; ++i) {
      const sprite = spritepool[i]
      if (sprite.id) {
        // animate movement
        const firstframe = visible.getX(i) === 0
        if (firstframe) {
          position.setXY(i, sprite.x, sprite.y)
          display.setXYZW(
            i,
            sprite.char % CHARS_PER_ROW,
            Math.floor(sprite.char / CHARS_PER_ROW),
            sprite.color,
            sprite.bg,
          )
          lastposition.setXYZ(i, sprite.x, sprite.y, time.value)
          lastcolor.setXY(i, sprite.color, time.value)
          lastbg.setXY(i, sprite.bg, time.value)
          visible.setX(i, 1)
          visible.needsUpdate = true
          position.needsUpdate = true
          display.needsUpdate = true
          lastposition.needsUpdate = true
          lastcolor.needsUpdate = true
          lastbg.needsUpdate = true
        } else {
          if (position.getX(i) !== sprite.x || position.getY(i) !== sprite.y) {
            lastposition.setXYZ(
              i,
              position.getX(i),
              position.getY(i),
              time.value,
            )
            position.setXY(i, sprite.x, sprite.y)
            lastposition.needsUpdate = true
            position.needsUpdate = true
          }
          const ncharu = sprite.char % CHARS_PER_ROW
          const ncharv = Math.floor(sprite.char / CHARS_PER_ROW)
          if (display.getX(i) !== ncharu || display.getY(i) !== ncharv) {
            display.setXY(i, ncharu, ncharv)
            display.needsUpdate = true
          }
          if (display.getZ(i) !== sprite.color) {
            lastcolor.setXY(i, display.getZ(i), time.value)
            display.setZ(i, sprite.color)
            lastcolor.needsUpdate = true
            display.needsUpdate = true
          }
          if (display.getW(i) !== sprite.bg) {
            lastbg.setXY(i, display.getW(i), time.value)
            display.setW(i, sprite.bg)
            lastbg.needsUpdate = true
            display.needsUpdate = true
          }
        }
      } else if (visible.getX(i)) {
        visible.setX(i, 0)
        visible.needsUpdate = true
      }
    }
    buffer.computeBoundingBox()
    buffer.computeBoundingSphere()
  }, [
    buffer,
    sprites,
    spritepool,
    range,
    visible,
    position,
    display,
    lastposition,
    lastcolor,
    lastbg,
  ])

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={setbuffer}>
        <bufferAttribute
          ref={setvisible}
          attach="attributes-visible"
          name="visible"
          args={[visiblearray, 1]}
        />
        <bufferAttribute
          ref={setposition}
          attach="attributes-position"
          name="position"
          args={[positionarray, 3]}
        />
        <bufferAttribute
          ref={setlastposition}
          attach="attributes-lastposition"
          name="lastpositiona"
          args={[lastpositionarray, 3]}
        />
        <bufferAttribute
          ref={setdisplay}
          attach="attributes-display"
          name="display"
          args={[displayarray, 4]}
        />
        <bufferAttribute
          ref={setlastcolor}
          attach="attributes-lastcolor"
          name="lastcolor"
          args={[lastcolorarray, 2]}
        />
        <bufferAttribute
          ref={setlastbg}
          attach="attributes-lastbg"
          name="lastbg"
          args={[lastbgarray, 2]}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  )
}
