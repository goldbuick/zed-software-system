import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
} from 'three'
import { CHARS_PER_ROW, SPRITE } from 'zss/gadget/data/types'
import { time } from 'zss/gadget/display/anim'
import { useSpritePool } from 'zss/gadget/display/spritepool'

type MaybeBufferAttr = BufferAttribute | InterleavedBufferAttribute | undefined

type SpritesProps = {
  sprites: SPRITE[]
}

const SPRITE_COUNT = 2048

export function SpriteGeometry({ sprites }: SpritesProps) {
  const bgRef = useRef<BufferGeometry>(null)
  const [spritepool] = useSpritePool(sprites, SPRITE_COUNT)

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
    current.computeBoundingBox()
    current.computeBoundingSphere()
  }, [sprites, spritepool])

  return <bufferGeometry ref={bgRef} />
}
