import { RUNTIME } from 'zss/config'
import { resetDither, useDither, writeDither } from 'zss/gadget/hooks'
import { DitherData, DitherRender } from 'zss/gadget/usedither'
import { TilesRender } from 'zss/gadget/usetiles'
import { TapeBlinker } from 'zss/screens/tape/blinker'

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
  resetDither(dither)
  for (let x = 0; x < panelwidth; ++x) {
    writeDither(dither, panelwidth, panelheight, x, row, WITHER_CENTER)
    for (let i = 0; i < wither.length; ++i) {
      const edge = wither.length - i
      writeDither(dither, panelwidth, panelheight, x, row - edge, wither[i])
      writeDither(dither, panelwidth, panelheight, x, row + edge, wither[i])
    }
  }

  return (
    <>
      <TilesRender width={width} height={height} />
      <group
        // eslint-disable-next-line react/no-unknown-property
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
        <TapeBlinker x={1} y={1} />
        <TapeBlinker x={1} y={2 + row} on={26} alt={27} off={45} color={12} />
      </group>
    </>
  )
}
