import { RUNTIME } from 'zss/config'
import { resetdither, useDither, writedither } from 'zss/gadget/dither'
import { DitherData, DitherRender } from 'zss/gadget/usedither'
import { TilesRender } from 'zss/gadget/usetiles'

type ScrollControlsProps = {
  row: number
  width: number
  height: number
  panelwidth: number
  panelheight: number
}

export function ScrollControls({
  row,
  width,
  height,
  panelwidth,
  panelheight,
  children,
}: React.PropsWithChildren<ScrollControlsProps>) {
  const ditherstore = useDither(panelwidth, panelheight, 0)

  const wither = [0.001, 0.05, 0.1, 0.2]
  const WITHER_CENTER = 0.4
  const { dither } = ditherstore.getState()
  resetdither(dither)
  for (let x = 0; x < panelwidth; ++x) {
    writedither(dither, panelwidth, panelheight, x, row, WITHER_CENTER)
    for (let i = 0; i < wither.length; ++i) {
      const edge = wither.length - i
      writedither(dither, panelwidth, panelheight, x, row - edge, wither[i])
      writedither(dither, panelwidth, panelheight, x, row + edge, wither[i])
    }
  }

  return (
    <>
      <TilesRender label="controls" width={width} height={height} />
      <group
        position={[
          2 * RUNTIME.DRAW_CHAR_WIDTH(),
          2 * RUNTIME.DRAW_CHAR_HEIGHT(),
          0,
        ]}
      >
        <DitherData store={ditherstore}>
          <DitherRender width={panelwidth} height={panelheight} />
        </DitherData>
        {children}
      </group>
    </>
  )
}
