import { ReactNode } from 'react'

import { Rect } from './Rect'

type Props = {
  debug?: boolean
  disabled?: boolean
  blocking?: boolean
  cursor?: string
  color?: number
  width?: number
  height?: number
  children?: ReactNode
  onClick?: () => void
} & JSX.IntrinsicElements['group']

export function Clickable({
  debug = false,
  disabled = false,
  blocking = true,
  cursor = 'pointer',
  width = 30,
  height = 10,
  children,
  onClick,
  ...props
}: Props) {
  return (
    <group {...props}>
      <Rect
        blocking={blocking}
        cursor={cursor}
        visible={debug}
        width={width}
        height={height}
        onClick={() => {
          if (!disabled) {
            onClick?.()
          }
        }}
      />
      {children}
    </group>
  )
}
