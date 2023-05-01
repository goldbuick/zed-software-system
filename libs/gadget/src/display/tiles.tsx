import { useRenderOnChangeDeep } from '@zss/yjs/binding'

import useTexture from '../img/useTexture'

import { CharSet } from './charSet'
import defaultCharSetUrl from './charSet.png'
import { LayerProps } from './types'

export function Tiles({ id, layer }: LayerProps) {
  // test code begin
  const map = useTexture(defaultCharSetUrl)
  // test code end
  useRenderOnChangeDeep(layer)

  const data = layer?.toJSON()
  const width = data?.width ?? 1
  const height = data?.height ?? 1
  const dimmed = data?.dimmed ?? false
  const chars: number[] = Object.values(data?.chars ?? { 0: 0 })
  const colors: number[] = Object.values(data?.colors ?? { 0: 0 })

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
