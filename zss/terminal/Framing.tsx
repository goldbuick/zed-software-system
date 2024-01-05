import { GroupProps, useThree } from '@react-three/fiber'
import React from 'react'

export function Framing({ children, ...props }: GroupProps) {
  const viewport = useThree((state) => state.viewport)
  const { width, height } = viewport.getCurrentViewport()

  return (
    <group {...props} scale-x={-1} rotation-z={Math.PI}>
      <group position={[width * -0.5, height * -0.5, 0]}>{children}</group>
    </group>
  )
}
