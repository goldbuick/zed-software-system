import { Lethargy } from 'lethargy-ts'
import { ReactNode } from 'react'
import { clamp } from 'zss/mapping/number'

import { Rect } from './rect'
import { ismac } from './userinput'

const lethargy = new Lethargy({
  sensitivity: ismac ? 7 : 2,
})

const STEP_COUNT_MAX = 4
const STEP_SCALE = 0.75

function mapdeltay(deltay: number) {
  const value = clamp(deltay, -STEP_COUNT_MAX, STEP_COUNT_MAX)
  return Math.round(value * STEP_SCALE)
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
        onWheel={(event) => {
          if (disabled || !lethargy.check(event)) {
            return
          }
          onScroll?.(mapdeltay(event.deltaY))
        }}
      />
      {children}
    </group>
  )
}
