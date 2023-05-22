import useInterval from '@use-it/interval/dist'
import { useRenderOnChangeDeep } from '@zss/yjs/binding'

import { getTLState, recycleTLState } from '../data/layer'
import useTexture from '../img/useTexture'

import { CharSet } from './charSet'
import defaultCharSetUrl from './charSet.png'
import { LayerProps } from './types'

export function Tiles({ id, layer }: LayerProps) {
  // test code begin
  const map = useTexture(defaultCharSetUrl)
  // test code end
  useRenderOnChangeDeep(layer)

  useInterval(() => {
    recycleTLState(layer)
  }, 1000)

  const { width, height, dimmed, chars, colors } = getTLState(layer)
  return (
    <CharSet
      map={map}
      alt={map}
      width={width}
      height={height}
      chars={chars}
      colors={colors}
      dimmed={dimmed}
    />
  )
}
