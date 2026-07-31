import { useEffect, useMemo } from 'react'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { useGadgetClient, useInspector } from 'zss/gadget/data/zustandstores'
import { BOARD_INSPECTOR_Z_FPV } from 'zss/gadget/graphics/boardinspectorz'
import { PillarwMeshes } from 'zss/gadget/graphics/pillarmeshes'
import { resettiles, useTiles, writetile } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { BOARD_HEIGHT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { readboardsolidmask } from './boardsolidmask'

const FINDANY_CHAR = 177

/** Align pillar bases with board walls (world z=0.5) when inspector sits at FPV floor hug. */
const FPV_WALL_PILLAR_LOCAL_Z = 0.5 - BOARD_INSPECTOR_Z_FPV

export function InspectorPts() {
  const pts = useInspector(useShallow((state) => state.pts))
  const gadgetlayers = useGadgetClient((state) => state.gadget.layers)
  const graphics = useMemo(
    () => layersreadcontrol(gadgetlayers ?? []).graphics,
    [gadgetlayers],
  )
  const isfpv = graphics === 'fpv'
  const solidmask = useMemo(
    () => readboardsolidmask(gadgetlayers),
    [gadgetlayers],
  )

  const store = useTiles(
    BOARD_WIDTH,
    BOARD_HEIGHT,
    0,
    COLOR.BLPURPLE,
    COLOR.ONCLEAR,
  )

  const wallpillars = useMemo(() => {
    const char = new Array<number>(BOARD_SIZE).fill(0)
    const color = new Array<number>(BOARD_SIZE).fill(COLOR.BLPURPLE)
    const bg = new Array<number>(BOARD_SIZE).fill(COLOR.ONCLEAR)
    if (!isfpv) {
      return { char, color, bg }
    }
    for (let i = 0; i < pts.length; ++i) {
      const pt = pts[i]
      const idx = pt.x + pt.y * BOARD_WIDTH
      if (idx >= 0 && idx < BOARD_SIZE && solidmask[idx]) {
        char[idx] = FINDANY_CHAR
      }
    }
    return { char, color, bg }
  }, [isfpv, pts, solidmask])

  useEffect(() => {
    const tiles = store.getState()
    resettiles(tiles, 0, COLOR.BLPURPLE, COLOR.ONCLEAR)
    for (let i = 0; i < pts.length; ++i) {
      const pt = pts[i]
      const idx = pt.x + pt.y * BOARD_WIDTH
      if (isfpv && idx >= 0 && idx < BOARD_SIZE && solidmask[idx]) {
        continue
      }
      writetile(tiles, BOARD_WIDTH, BOARD_HEIGHT, pt.x, pt.y, {
        char: FINDANY_CHAR,
        color: COLOR.BLPURPLE,
        bg: COLOR.ONCLEAR,
      })
    }
    tiles.changed()
  }, [store, pts, isfpv, solidmask])

  return (
    <group position-z={0}>
      <TilesData store={store}>
        <TilesRender
          label="pts"
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          skipraycast
        />
      </TilesData>
      {isfpv && (
        <group position-z={FPV_WALL_PILLAR_LOCAL_Z}>
          <PillarwMeshes
            width={BOARD_WIDTH}
            char={wallpillars.char}
            color={wallpillars.color}
            bg={wallpillars.bg}
            skipraycast
          />
        </group>
      )}
    </group>
  )
}
