import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { Marquee } from '../scroll/marquee'

import { useTape } from './data/state'
import { ShadeBoxDither } from './graphics/dither'
import { useTiles } from './hooks'
import { useScreenSize } from './userscreen'
import { TilesData, TilesRender } from './usetiles'

function TapeActiveToast({ context }: { context: WRITE_TEXT_CONTEXT }) {
  return (
    <group position={[0, 0, 999]}>
      <TilesRender width={context.width} height={context.height} />
    </group>
  )
}

export function TapeToast() {
  const { toast } = useTape()
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
          <Marquee
            margin={1}
            color={COLOR.YELLOW}
            y={0}
            leftedge={0}
            rightedge={rightedge}
            line={toast}
            context={context}
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
