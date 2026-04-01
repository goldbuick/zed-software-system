import type { LAYER } from 'zss/gadget/data/types'
import { CORNER_EXIT_DISPUTED } from 'zss/memory/boardcornerexits'

import {
  type EXIT_DIRECTION,
  buildundiscoveredexitlayers,
} from './undiscoveredexitlayers'

export type ExitPreviewResolve = {
  layers: LAYER[]
  showcachedtint: boolean
}

export function resolveexitpreview(
  exitboardid: string,
  layercachemap: Map<string, LAYER[]>,
  direction: EXIT_DIRECTION,
): ExitPreviewResolve {
  if (!exitboardid) {
    return { layers: [], showcachedtint: false }
  }
  if (exitboardid === CORNER_EXIT_DISPUTED) {
    return {
      layers: buildundiscoveredexitlayers(direction),
      showcachedtint: false,
    }
  }
  const cached = layercachemap.get(exitboardid) ?? []
  if (cached.length > 0) {
    return { layers: cached, showcachedtint: true }
  }
  return {
    layers: buildundiscoveredexitlayers(direction),
    showcachedtint: false,
  }
}
