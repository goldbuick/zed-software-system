import { Color } from 'three'
import { RUNTIME } from 'zss/config'
import { Rect } from 'zss/gadget/rect'
import { PanelComponent } from 'zss/screens/panel/component'
import { ScreenUIFramed } from 'zss/screens/screenui/framed'

import { RECT, RECT_TYPE, useScreenUILayoutContext } from './layoutstate'

type LayoutRectProps = {
  rect: RECT
}

function LayoutRect({ rect }: LayoutRectProps) {
  switch (rect.type) {
    case RECT_TYPE.PANEL:
      return (
        <group position-z={512}>
          <PanelComponent
            width={rect.width}
            height={rect.height}
            color={14}
            bg={1}
            text={rect.text}
            ymargin={0}
          />
        </group>
      )
    case RECT_TYPE.FRAMED:
      return <ScreenUIFramed width={rect.width} height={rect.height} />
    default:
      return null
  }
}

export function ScreenUILayout() {
  const layout = useScreenUILayoutContext()

  if (!layout) {
    return null
  }

  const { screensize, rects } = layout

  return (
    <>
      <group
        position={[
          -RUNTIME.DRAW_CHAR_WIDTH(),
          -RUNTIME.DRAW_CHAR_HEIGHT(),
          -524,
        ]}
      >
        <Rect
          visible
          color={new Color(0.076, 0.076, 0)}
          width={screensize.cols + 2}
          height={screensize.rows + 2}
        />
      </group>
      <group position={[0, 0, -512]}>
        {rects.map((rect) => {
          return (
            <group
              key={rect.name}
              position={[
                rect.x * RUNTIME.DRAW_CHAR_WIDTH(),
                rect.y * RUNTIME.DRAW_CHAR_HEIGHT(),
                0,
              ]}
            >
              <LayoutRect rect={rect} />
            </group>
          )
        })}
      </group>
    </>
  )
}
