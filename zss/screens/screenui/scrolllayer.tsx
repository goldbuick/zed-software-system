import { useFrame } from '@react-three/fiber'
import { damp } from 'maath/easing'
import React, { useRef } from 'react'
import type { ShaderMaterial } from 'three'
import { RUNTIME } from 'zss/config'
import { StaticDither } from 'zss/gadget/graphics/dither'
import { ScrollComponent } from 'zss/screens/scroll/component'

import { useScreenUILayoutContext } from './layoutstate'

const SCROLL_DITHER_ALPHA = 0.14
/** maath damp smoothTime -- seconds to approach target. */
const SCROLL_DITHER_ANIM_RATE = 0.55

export function ScreenUIScrollLayer() {
  const layout = useScreenUILayoutContext()
  const hasscroll = layout?.hasscroll ?? false
  const isscrollempty = layout?.isscrollempty ?? true
  const materialref = useRef<ShaderMaterial | null>(null)
  const targetref = useRef(0)
  targetref.current = hasscroll && !isscrollempty ? 1 : 0

  useFrame((_, delta) => {
    const material = materialref.current
    if (!material?.uniforms.fade) {
      return
    }
    if (!hasscroll) {
      material.uniforms.fade.value = 0
      return
    }
    damp(
      material.uniforms.fade,
      'value',
      targetref.current,
      SCROLL_DITHER_ANIM_RATE,
      delta,
    )
  })

  if (!hasscroll || !layout) {
    return null
  }

  const { screensize, scrollrect } = layout

  return (
    <React.Fragment key="scroll">
      <group position={[0, 0, 800]}>
        <StaticDither
          width={screensize.cols}
          height={screensize.rows}
          alpha={SCROLL_DITHER_ALPHA}
          initialfade={0}
          materialref={materialref}
        />
      </group>
      <group
        position={[
          scrollrect.x * RUNTIME.DRAW_CHAR_WIDTH(),
          scrollrect.y * RUNTIME.DRAW_CHAR_HEIGHT(),
          900,
        ]}
      >
        <ScrollComponent
          width={scrollrect.width}
          height={scrollrect.height}
          color={14}
          bg={1}
          text={scrollrect.text}
          shouldclose={isscrollempty}
        />
      </group>
    </React.Fragment>
  )
}
