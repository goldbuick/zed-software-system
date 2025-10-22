import { JSX, ReactNode } from 'react'
import { clamp } from 'zss/mapping/number'
import { ismac } from 'zss/words/system'

import { Rect } from './rect'

const STEP_COUNT_MAX = 4
const STEP_SCALE = ismac ? 0.25 : 0.5

function mapdeltay(deltay: number) {
  const value = clamp(deltay, -STEP_COUNT_MAX, STEP_COUNT_MAX)
  return Math.floor(value * STEP_SCALE)
}

type Props = {
  debug?: boolean
  disabled?: boolean
  blocking?: boolean
  cursor?: string
  color?: number
  x?: number
  y?: number
  width?: number
  height?: number
  children?: ReactNode
  onClick?: () => void
  onScroll?: (deltay: number) => void
} & JSX.IntrinsicElements['group']

export function Scrollable({
  debug = false,
  disabled = false,
  blocking = true,
  cursor = 'pointer',
  x = 0,
  y = 0,
  width = 30,
  height = 10,
  children,
  onClick,
  onScroll,
  ...props
}: Props) {
  return (
    <group {...props}>
      <Rect
        blocking={blocking}
        cursor={cursor}
        visible={debug}
        x={x}
        y={y}
        width={width}
        height={height}
        onClick={onClick}
        onWheel={(event: any) => {
          if (disabled) {
            return
          }
          onScroll?.(mapdeltay(event.deltaY))
        }}
      />
      {children}
    </group>
  )
}
