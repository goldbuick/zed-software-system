import React from 'react'
import { RUNTIME } from 'zss/config'
import { StaticDither } from 'zss/gadget/graphics/dither'
import { ScrollComponent } from 'zss/screens/scroll/component'

import { useScreenUILayoutContext } from './layoutstate'

export function ScreenUIScrollLayer() {
  const layout = useScreenUILayoutContext()

  if (!layout?.hasscroll) {
    return null
  }

  const { screensize, scrollrect, isscrollempty } = layout

  return (
    <React.Fragment key="scroll">
      <group position={[0, 0, 800]}>
        <StaticDither
          width={screensize.cols}
          height={screensize.rows}
          alpha={0.14}
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
