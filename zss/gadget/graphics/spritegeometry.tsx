import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
} from 'three'
import { CHARS_PER_ROW, SPRITE } from 'zss/gadget/data/types'
import { time } from 'zss/gadget/display/anim'
import { useSpritePool } from 'zss/gadget/display/spritepool'
import { ispresent } from 'zss/mapping/types'

type MaybeBufferAttr = BufferAttribute | InterleavedBufferAttribute | undefined

type SpritesProps = {
  sprites: SPRITE[]
}

const SPRITE_COUNT = 2048

export function SpriteGeometry({ sprites }: SpritesProps) {
  const [bg, setbg] = useState<BufferGeometry>()
  const [spritepool] = useSpritePool(sprites, SPRITE_COUNT)

  useEffect(() => {
    if (!ispresent(bg)) {
      return
    }

    // get data
    let visible: MaybeBufferAttr = bg.getAttribute('visible')
    let lastVisible: MaybeBufferAttr = bg.getAttribute('lastVisible')
    let position: MaybeBufferAttr = bg.getAttribute('position')
    let charData: MaybeBufferAttr = bg.getAttribute('charData')
    let lastPosition: MaybeBufferAttr = bg.getAttribute('lastPosition')
    let lastColor: MaybeBufferAttr = bg.getAttribute('lastColor')
    let lastBg: MaybeBufferAttr = bg.getAttribute('lastBg')
    let animShake: MaybeBufferAttr = bg.getAttribute('animShake')
    let animBounce: MaybeBufferAttr = bg.getAttribute('animBounce')

    // create
    if (!visible || visible.count !== sprites.length) {
      // init data
      visible = new BufferAttribute(new Float32Array(sprites.length), 1)
      lastVisible = new BufferAttribute(new Float32Array(sprites.length), 1)
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
        const isvisible = sprite.id ? 1 : 0
        visible.setX(i, isvisible)
        lastVisible.setX(i, isvisible)
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

      bg.setAttribute('visible', visible)
      bg.setAttribute('lastVisible', lastVisible)
      bg.setAttribute('position', position)
      bg.setAttribute('charData', charData)
      bg.setAttribute('lastPosition', lastPosition)
      bg.setAttribute('lastColor', lastColor)
      bg.setAttribute('lastBg', lastBg)
      bg.setAttribute('animShake', animShake)
      bg.setAttribute('animBounce', animBounce)
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

        // update visible
        lastVisible.setX(i, visible.getX(i))
        lastVisible.needsUpdate = true

        visible.setX(i, sprite.id ? 1 : 0)
        visible.needsUpdate = true

        // check for first frame
        const firstframe = lastVisible.getX(i) === 0 && visible.getX(i) === 1
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

        if (firstframe || ccolor !== sprite.color) {
          lastColor.setXY(i, firstframe ? sprite.color : ccolor, time.value)
          lastColor.needsUpdate = true

          charData.setZ(i, sprite.color)
          charData.needsUpdate = true
        }

        if (firstframe || cbg !== sprite.bg) {
          lastBg.setXY(i, firstframe ? sprite.bg : cbg, time.value)
          lastBg.needsUpdate = true

          charData.setW(i, sprite.bg)
          charData.needsUpdate = true
        }

        const ncharu = sprite.char % CHARS_PER_ROW
        const ncharv = Math.floor(sprite.char / CHARS_PER_ROW)
        if (ccharu !== ncharu || ccharv !== ncharv) {
          charData.setXY(i, ncharu, ncharv)
          charData.needsUpdate = true
        }
      }
    }
    bg.computeBoundingBox()
    bg.computeBoundingSphere()
  }, [bg, sprites, spritepool])

  return <bufferGeometry ref={setbg} />
}
