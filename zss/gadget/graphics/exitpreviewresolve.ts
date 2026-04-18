import type { LAYER } from 'zss/gadget/data/types'
import { CORNER_EXIT_DISPUTED, EXIT_PREVIEW_UNKNOWN } from 'zss/memory/types'

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
  hasunderboard?: boolean,
): ExitPreviewResolve {
  if (
    exitboardid === EXIT_PREVIEW_UNKNOWN ||
    exitboardid === CORNER_EXIT_DISPUTED
  ) {
    if (hasunderboard) {
      return { layers: [] }
    }
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
  if (hasunderboard) {
    return { layers: [] }
  }
  return {
    layers: buildundiscoveredexitlayers(direction),
  }
}
