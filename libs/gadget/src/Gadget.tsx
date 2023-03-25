import { CharSet } from './display/CharSet'
import defaultCharSetUrl from './img/charset.png'
import usePaddedTexture from './img/usePaddedTexture'
import { range } from '@zss/system/mapping/array'
import { Rect } from './display/Rect'
import { COLOR } from './img/colors'
import { TILE_SIZE } from './img/tiles'
import { useMemo } from 'react'

export function Gadget() {
  const map = usePaddedTexture(defaultCharSetUrl)

  const chars = useMemo(
    () => range(16 * 16).map((code) => ({ code, color: 1 + (code % 16) })),
    [],
  )

  return (
    <>
      <CharSet
        map={map}
        alt={map}
        width={16}
        height={16}
        chars={chars}
        outline
        position={[0, 0, 10]}
      />
      <Rect width={8} height={8} color={COLOR.BLUE} map={map} alt={map} />
      <Rect
        width={8}
        height={8}
        color={COLOR.RED}
        map={map}
        alt={map}
        position={[TILE_SIZE * 8, TILE_SIZE * 8, 0]}
      />
    </>
  )
}
