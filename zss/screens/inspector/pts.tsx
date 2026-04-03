import { useInspector } from 'zss/gadget/data/state'
import { resettiles, useTiles, writetile } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

export function InspectorPts() {
  const pts = useInspector(useShallow((state) => state.pts))
  const store = useTiles(
    BOARD_WIDTH,
    BOARD_HEIGHT,
    0,
    COLOR.BLBLACK,
    COLOR.ONCLEAR,
  )

  const tiles = store.getState()

  resettiles(tiles, 32, COLOR.BLBLACK, COLOR.ONCLEAR)
  for (let i = 0; i < pts.length; ++i) {
    const pt = pts[i]
    writetile(tiles, BOARD_WIDTH, BOARD_HEIGHT, pt.x, pt.y, {
      char: 177,
    })
  }

  return (
    <group position-z={100}>
      <TilesData store={store}>
        <TilesRender
          label="pts"
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          skipraycast
        />
      </TilesData>
    </group>
  )
}
