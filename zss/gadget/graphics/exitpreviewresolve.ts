import type { LAYER } from 'zss/gadget/data/types'
import { CORNER_EXIT_DISPUTED } from 'zss/memory/types'

import {
  type EXIT_DIRECTION,
  buildundiscoveredexitlayers,
} from './undiscoveredexitlayers'

export type ExitPreviewResolve = {
  layers: LAYER[]
}

export function resolveexitpreview(
  exitboardid: string,
  layercachemap: Map<string, LAYER[]>,
  direction: EXIT_DIRECTION,
): ExitPreviewResolve {
  if (exitboardid === CORNER_EXIT_DISPUTED) {
    return {
      layers: buildundiscoveredexitlayers(direction),
    }
  }
  const cached = layercachemap.get(exitboardid) ?? []
  if (cached.length > 0) {
    return {
      layers: cached,
    }
  }
  return {
    layers: buildundiscoveredexitlayers(direction),
  }
}
