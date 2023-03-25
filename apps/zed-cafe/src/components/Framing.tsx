import { GroupProps } from '@react-three/fiber'
import useViewport from '../hooks/useViewport'

export function Framing({ children, ...props }: GroupProps) {
  const { width, height } = useViewport()
  return (
    <group {...props} scale-x={-1} rotation-z={Math.PI}>
      <group position={[width * -0.5, height * -0.5, 0]}>{children}</group>
    </group>
  )
}
