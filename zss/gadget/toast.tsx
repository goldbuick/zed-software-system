import { useTiles } from 'zss/gadget/tiles'
import { ScrollMarquee } from 'zss/screens/scroll/marquee'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from './graphics/dither'
import { useScreenSize } from './userscreen'
import { TilesData, TilesRender } from './usetiles'

type TapeActiveToastProps = {
  context: WRITE_TEXT_CONTEXT
}

function TapeActiveToast({ context }: TapeActiveToastProps) {
  return (
    <group position={[0, 0, 999]}>
      <TilesRender
        label="toast"
        width={context.width}
        height={context.height}
      />
    </group>
  )
}

type TapeToastProps = {
  toast: string
}

export function TapeToast({ toast }: TapeToastProps) {
  const screensize = useScreenSize()

  const store = useTiles(screensize.cols, 1, 0, COLOR.GREEN, COLOR.ONCLEAR)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(
      screensize.cols,
      1,
      COLOR.GREEN,
      COLOR.ONCLEAR,
      0,
      0,
      screensize.cols - 1,
      1,
    ),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const rightedge = screensize.cols - 1
  return (
    <TilesData store={store}>
      {toast && (
        <>
          <ScrollMarquee
            margin={1}
            color={COLOR.YELLOW}
            y={0}
            leftedge={0}
            rightedge={rightedge}
            line={`${toast}$32$19$32`}
          />
          <group position={[0, 0, 998]}>
            <ShadeBoxDither
              alpha={0.4}
              width={screensize.cols}
              height={10}
              top={0}
              left={0}
              right={rightedge}
              bottom={0}
            />
          </group>
          <TapeActiveToast context={context} />
        </>
      )}
    </TilesData>
  )
}
