import { range } from '@zss/system/mapping/array'
import { useMemo } from 'react'
import { COLOR } from '../img/colors'
import { Char, CharSet, CharSetProps } from './CharSet'

export type RectProps = {
  color?: COLOR
} & Omit<CharSetProps, 'chars'>

export function Rect({
  width = 1,
  height = 1,
  color = COLOR.WHITE,
  ...props
}: RectProps) {
  const chars = useMemo(
    () => range(width * height).map(() => ({ color, code: 219 })) as Char[],
    [width, height, color],
  )
  return <CharSet width={width} height={height} chars={chars} {...props} />
}
